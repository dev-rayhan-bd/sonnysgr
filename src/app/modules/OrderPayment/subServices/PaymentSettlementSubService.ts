import mongoose from "mongoose";
import Stripe from "stripe";
import OrderPaymentModel from "../OrderPayment.model";
import { OrderItemModel, OrderModel } from "../../Order/Order.model";
import CartModel from "../../Cart/Cart.model";
import { OrderInventorySubService } from "../../Order/subServices/OrderInventorySubService";
import NotificationHelper from "../../../../helper/notification";
import {
  ENUM_CART_STATUS,
  ENUM_NOTIFICATION_TYPE,
  ENUM_ORDER_ITEM_STATUS,
  ENUM_ORDER_STATUS,
  ENUM_PAYMENT_STATUS,
} from "../../../../utilities/enum";
import { ORDER_PAYMENT_STATUS, ORDER_PAYMENT_TYPE, REFUND_REASON, toCents } from "../OrderPayment.constant";
import { runInTransaction } from "../OrderPayment.utils";
import { PaymentRefundSubService } from "./PaymentRefundSubService";
import { StripeCheckoutSubService } from "./StripeCheckoutSubService";

type TOrderDoc = InstanceType<typeof OrderModel>;

/**
 * Sub-Service that moves an order from "Pending Payment" to paid, or to cancelled.
 * Every transition is a conditional (compare-and-set) update inside one transaction, so a
 * duplicate webhook, a webhook racing the reconciliation cron, or a retry can never apply twice.
 */
export class PaymentSettlementSubService {
  /** checkout.session.completed (paid) / async_payment_succeeded / reconciliation found it paid. */
  static async confirmPayment(paymentId: string, stripeSession: Stripe.Checkout.Session) {
    const outcome = await runInTransaction(async (session) => {
      // Compare-and-set: only the first confirmation wins
      const previous = await OrderPaymentModel.findOneAndUpdate(
        {
          _id: paymentId,
          paidAt: null,
          status: {
            $in: [ORDER_PAYMENT_STATUS.PENDING, ORDER_PAYMENT_STATUS.FAILED, ORDER_PAYMENT_STATUS.CANCELLED],
          },
        },
        {
          $set: {
            status: ORDER_PAYMENT_STATUS.SUCCESS,
            paidAt: new Date(),
            stripeSessionId: stripeSession.id,
            stripePaymentIntentId: StripeCheckoutSubService.paymentIntentId(stripeSession),
            ...(typeof stripeSession.amount_total === "number"
              ? { capturedAmount: stripeSession.amount_total / 100 }
              : {}),
          },
        },
        { new: false, session }
      );
      if (!previous) return { applied: false as const, reason: "already-confirmed" };

      const order = await OrderModel.findById(previous.orderId).session(session);
      const amountMatches = stripeSession.amount_total === toCents(previous.amount);
      const legacy = !!order && this.isLegacyUnpaidOrder(order);
      const orderAwaitingPayment =
        previous.status === ORDER_PAYMENT_STATUS.PENDING &&
        (order?.orderStatus === ENUM_ORDER_STATUS.PENDING_PAYMENT || legacy);

      // Paid after we gave up on it (expired/cancelled), or Stripe charged an unexpected amount
      if (!order || !orderAwaitingPayment || !amountMatches) {
        if (order && orderAwaitingPayment) await this.cancelUnpaidOrderInTx(order, session);
        const queued = await PaymentRefundSubService.queueRefund({
          orderId: previous.orderId,
          reason: amountMatches ? REFUND_REASON.LATE_PAYMENT : REFUND_REASON.AMOUNT_MISMATCH,
          refundKey: `auto-refund:${paymentId}`,
          session,
        });
        return { applied: false as const, reason: "refund-queued", refundPaymentId: queued?.paymentId };
      }

      const items = await OrderItemModel.find({ orderId: order._id }).session(session);
      if (legacy) {
        // Checkout opened before this release: stock was already deducted, nothing reserved
        order.paymentStatus = ENUM_PAYMENT_STATUS.PAID;
        await order.save({ session });
        return { applied: true as const, order, items };
      }
      if (previous.paymentType === ORDER_PAYMENT_TYPE.HOLD_DEPOSIT) {
        await this.activateHoldInTx(order, items, session);
      } else {
        await this.activateBuyOrderInTx(order, items, session);
      }
      return { applied: true as const, order, items };
    });

    if (!outcome.applied) {
      if (outcome.refundPaymentId) await PaymentRefundSubService.processPaymentRefunds(outcome.refundPaymentId);
      return outcome;
    }

    this.notifyRetailers(outcome.order, outcome.items);
    return { applied: true, orderId: outcome.order._id };
  }

  private static async activateBuyOrderInTx(
    order: TOrderDoc,
    items: InstanceType<typeof OrderItemModel>[],
    session: mongoose.ClientSession
  ) {
    for (const item of items) {
      await OrderInventorySubService.commitReservation(item, session);
    }
    await OrderItemModel.updateMany(
      { orderId: order._id, status: ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT },
      { $set: { status: ENUM_ORDER_ITEM_STATUS.PLACED } },
      { session }
    );
    order.orderStatus = ENUM_ORDER_STATUS.PLACED; // now visible in the retailer "Needs Action" tab
    order.paymentStatus = ENUM_PAYMENT_STATUS.PAID;
    await order.save({ session });

    // Only the cart lines that were actually bought leave the cart
    await CartModel.updateMany(
      {
        buyerId: order.buyerId,
        status: ENUM_CART_STATUS.ACTIVE,
        $or: items.map((i) => ({ productId: i.productId, selectedSize: { $in: [i.selectedSize, Number(i.selectedSize)] } })),
      },
      { $set: { status: ENUM_CART_STATUS.ORDERED } },
      { session }
    );
  }

  private static async activateHoldInTx(
    order: TOrderDoc,
    items: InstanceType<typeof OrderItemModel>[],
    session: mongoose.ClientSession
  ) {
    // The hold countdown starts when the deposit is paid, not when checkout was opened
    const start = new Date();
    const end = new Date(start.getTime() + (order.holdingTime || 0) * 60 * 60 * 1000);
    const fullyPaid = (order.partialPayment || 0) >= order.totalAmount;

    order.orderStatus = ENUM_ORDER_STATUS.HOLDING;
    order.paymentStatus = fullyPaid ? ENUM_PAYMENT_STATUS.PAID : ENUM_PAYMENT_STATUS.PARTIALLY_PAID;
    order.holdingStartTime = start;
    order.holdingEndTime = end;
    order.pickupTime = end;
    await order.save({ session });

    await OrderItemModel.updateMany(
      { _id: { $in: items.map((i) => i._id) }, status: ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT },
      { $set: { status: ENUM_ORDER_ITEM_STATUS.HOLDING, pickupTime: end } },
      { session }
    );
  }

  /** checkout.session.expired / async_payment_failed / Stripe session could not be created. */
  static async failPayment(paymentId: string, reason: string, expired = false) {
    return await runInTransaction(async (session) => {
      const payment = await OrderPaymentModel.findOneAndUpdate(
        { _id: paymentId, status: ORDER_PAYMENT_STATUS.PENDING },
        {
          $set: {
            status: expired ? ORDER_PAYMENT_STATUS.CANCELLED : ORDER_PAYMENT_STATUS.FAILED,
            failedAt: new Date(),
            failureReason: reason,
          },
        },
        { new: true, session }
      );
      if (!payment) return { applied: false };

      const order = await OrderModel.findById(payment.orderId).session(session);
      if (order) await this.cancelUnpaidOrderInTx(order, session);
      return { applied: true };
    });
  }

  /**
   * Cancel an order still in "Pending Payment" and return its reserved stock.
   * No-op for any other status. Also used by the buyer cancel flow.
   */
  /**
   * Orders created by the pre-"Pending Payment" checkout were saved as Placed + payment Pending,
   * with stock deducted directly (no reservation). New code never produces that combination.
   */
  static isLegacyUnpaidOrder(order: { orderStatus: string; paymentStatus: string }) {
    return order.orderStatus === ENUM_ORDER_STATUS.PLACED && order.paymentStatus === ENUM_PAYMENT_STATUS.PENDING;
  }

  static async cancelUnpaidOrderInTx(order: TOrderDoc, session: mongoose.ClientSession) {
    const claimed = await OrderModel.findOneAndUpdate(
      {
        _id: order._id,
        $or: [
          { orderStatus: ENUM_ORDER_STATUS.PENDING_PAYMENT },
          { orderStatus: ENUM_ORDER_STATUS.PLACED, paymentStatus: ENUM_PAYMENT_STATUS.PENDING },
        ],
      },
      { $set: { orderStatus: ENUM_ORDER_STATUS.CANCELLED, paymentStatus: ENUM_PAYMENT_STATUS.FAILED } },
      { new: true, session }
    );
    if (!claimed) return false;

    // returnToStock knows a Pending Payment item was reserved and a legacy Placed one was not
    const items = await OrderItemModel.find({
      orderId: order._id,
      status: { $in: [ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT, ENUM_ORDER_ITEM_STATUS.PLACED] },
    }).session(session);
    for (const item of items) {
      await OrderInventorySubService.returnToStock(item, session);
      item.status = ENUM_ORDER_ITEM_STATUS.CANCELLED;
      await item.save({ session });
    }

    await OrderPaymentModel.updateMany(
      { orderId: order._id, status: ORDER_PAYMENT_STATUS.PENDING },
      { $set: { status: ORDER_PAYMENT_STATUS.CANCELLED, failedAt: new Date(), failureReason: "ORDER_CANCELLED" } },
      { session }
    );
    return true;
  }

  private static notifyRetailers(order: TOrderDoc, items: InstanceType<typeof OrderItemModel>[]) {
    const isHold = order.orderStatus === ENUM_ORDER_STATUS.HOLDING;
    const retailerIds = [...new Set(items.map((i) => String(i.retailerId)))];
    for (const retailerId of retailerIds) {
      NotificationHelper.createNotification({
        toId: retailerId,
        toModel: "Retailer",
        title: isHold ? "New deposit hold" : "New paid order",
        description: `Order ${order.orderNumber} is paid and ${isHold ? "on hold for pickup" : "waiting for you to accept"}.`,
        type: ENUM_NOTIFICATION_TYPE.NEW_ORDER,
        referenceId: String(order._id),
        referenceModel: "Order",
      }).catch((err) => console.error("[PAYMENT] retailer notification failed:", err));
    }
  }
}
