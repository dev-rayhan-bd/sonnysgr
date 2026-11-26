import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import OrderPaymentModel from "../OrderPayment.model";
import BuyerModel from "../../Buyer/Buyer.model";
import { ORDER_PAYMENT_STATUS, ORDER_PAYMENT_TYPE, TOrderPaymentType, toCents } from "../OrderPayment.constant";
import {
  IBuyNowPayload,
  ICheckoutRedirects,
  ICheckoutResult,
  IHoldDepositPayload,
  IPlaceOrderPayload,
} from "../OrderPayment.interface";
import { runInTransaction } from "../OrderPayment.utils";
import { PendingOrderSubService } from "./PendingOrderSubService";
import { ICheckoutLine, StripeCheckoutSubService } from "./StripeCheckoutSubService";
import { PaymentSettlementSubService } from "./PaymentSettlementSubService";

interface IPreparedCheckout {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  paymentId: mongoose.Types.ObjectId;
  transactionId: string;
  amount: number;
  lines: ICheckoutLine[];
  paymentBreakdown: Record<string, number>;
}

/**
 * Sub-Service orchestrating buyer checkouts as a saga:
 *   1. ONE transaction: create the "Pending Payment" order + reserve stock + PENDING payment row.
 *   2. Outside the transaction: create the Stripe Checkout session (idempotency key = paymentId).
 *   3. If Stripe fails: compensate (payment FAILED, order cancelled, stock returned) and report 502.
 * The webhook (PaymentSettlementSubService) finishes the order when Stripe confirms payment.
 */
export class OrderPaymentCheckoutSubService {
  private static async createPaymentRow(
    params: { orderId: mongoose.Types.ObjectId; buyerId: string; amount: number; paymentType: TOrderPaymentType },
    session: mongoose.ClientSession
  ) {
    const transactionId = `TXN-${randomUUID()}`;
    const [payment] = await OrderPaymentModel.create(
      [
        {
          orderId: params.orderId,
          buyerId: new mongoose.Types.ObjectId(params.buyerId),
          paymentType: params.paymentType,
          amount: params.amount,
          currency: "usd",
          gateway: "STRIPE",
          transactionId,
          status: ORDER_PAYMENT_STATUS.PENDING,
        },
      ],
      { session }
    );
    return payment;
  }

  private static async openStripeCheckout(
    buyerId: string,
    paymentType: TOrderPaymentType,
    prepared: IPreparedCheckout,
    redirects: ICheckoutRedirects
  ): Promise<ICheckoutResult> {
    const buyer = (await BuyerModel.findById(buyerId).select("email").lean()) as { email?: string } | null;

    try {
      const stripeSession = await StripeCheckoutSubService.createSession({
        paymentId: String(prepared.paymentId),
        orderId: String(prepared.orderId),
        transactionId: prepared.transactionId,
        paymentType,
        lines: prepared.lines,
        customerEmail: buyer?.email,
        redirects,
      });

      return {
        orderId: prepared.orderId,
        orderNumber: prepared.orderNumber,
        paymentId: prepared.paymentId,
        paymentType,
        transactionId: prepared.transactionId,
        paymentLink: stripeSession.url,
        expiresAt: stripeSession.expiresAt,
        amountDue: prepared.amount,
        paymentBreakdown: prepared.paymentBreakdown,
      };
    } catch (error) {
      // Compensating action: nothing stays reserved for a checkout that never opened
      await PaymentSettlementSubService.failPayment(String(prepared.paymentId), "CHECKOUT_CREATION_FAILED");
      throw new AppError(
        StatusCodes.BAD_GATEWAY,
        `Unable to start payment: ${error instanceof Error ? error.message : "Stripe error"}`
      );
    }
  }

  /** POST /order-payment/place-order: cart / multi-item checkout. */
  static async placeOrder(buyerId: string, payload: IPlaceOrderPayload) {
    const prepared = await runInTransaction(async (session) => {
      const { order, lines } = await PendingOrderSubService.createPendingBuyOrder(
        buyerId,
        payload.orderItems,
        payload.shippingAddress,
        session
      );
      const payment = await this.createPaymentRow(
        { orderId: order._id, buyerId, amount: order.totalAmount, paymentType: ORDER_PAYMENT_TYPE.ORDER },
        session
      );

      const checkoutLines: ICheckoutLine[] = lines.map((line) => ({
        name: `${line.product.name} — size ${line.size}`,
        description: line.product.brand,
        unitAmountCents: toCents(line.unitPrice),
        quantity: line.quantity,
      }));
      if (order.shippingCharge > 0) {
        checkoutLines.push({ name: "Shipping & service", unitAmountCents: toCents(order.shippingCharge), quantity: 1 });
      }

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentId: payment._id as mongoose.Types.ObjectId,
        transactionId: payment.transactionId,
        amount: order.totalAmount,
        lines: checkoutLines,
        paymentBreakdown: {
          subtotal: order.subtotal,
          shippingCharge: order.shippingCharge,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
        },
      };
    });

    return await this.openStripeCheckout(buyerId, ORDER_PAYMENT_TYPE.ORDER, prepared, payload);
  }

  /** POST /order/create-buy-now: single item, same payment flow as place-order. */
  static async buyNow(buyerId: string, payload: IBuyNowPayload) {
    return await this.placeOrder(buyerId, {
      shippingAddress: payload.shippingAddress as IPlaceOrderPayload["shippingAddress"],
      orderItems: [
        { productId: payload.productId, selectedSize: payload.selectedSize, quantity: payload.quantity || 1 },
      ],
      successUrl: payload.successUrl,
      cancelUrl: payload.cancelUrl,
    });
  }

  /** POST /order/create-hold-deposit: pay the deposit, then the hold countdown starts. */
  static async holdDeposit(buyerId: string, payload: IHoldDepositPayload) {
    const prepared = await runInTransaction(async (session) => {
      const { order, line, deposit, holdingHours } = await PendingOrderSubService.createPendingHold(
        buyerId,
        payload,
        session
      );
      const payment = await this.createPaymentRow(
        { orderId: order._id, buyerId, amount: deposit, paymentType: ORDER_PAYMENT_TYPE.HOLD_DEPOSIT },
        session
      );

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentId: payment._id as mongoose.Types.ObjectId,
        transactionId: payment.transactionId,
        amount: deposit,
        lines: [
          {
            name: `Hold deposit — ${line.product.name} (size ${line.size})`,
            description: `Reserves the pair for ${holdingHours}h. Deducted from the in-store price.`,
            unitAmountCents: toCents(deposit),
            quantity: 1,
          },
        ],
        paymentBreakdown: {
          totalAmount: order.totalAmount,
          depositAmount: deposit,
          remainingBalanceAtCounter: Math.max(0, Math.round((order.totalAmount - deposit) * 100) / 100),
          holdingHours,
        },
      };
    });

    return await this.openStripeCheckout(buyerId, ORDER_PAYMENT_TYPE.HOLD_DEPOSIT, prepared, payload);
  }
}
