import mongoose from 'mongoose';
import { OrderItemModel, OrderModel } from '../Order.model';
import QueryBuilder from '../../../builder/QueryBuilder';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS } from '../../../../utilities/enum';
import { OrderInventorySubService } from './OrderInventorySubService';
import OrderPaymentFacadeService from '../../OrderPayment/OrderPaymentFacadeService';
import OrderPaymentModel from '../../OrderPayment/OrderPayment.model';
import { HOLD_DEPOSIT_RULES, REFUND_REASON } from '../../OrderPayment/OrderPayment.constant';
import { runInTransaction } from '../../OrderPayment/OrderPayment.utils';
import { OrderPickupVerificationSubService } from './OrderPickupVerificationSubService';

/**
 * Sub-Service dedicated to Buyer Order History, Tracking & Cancellation
 * Strictly uses native MongoDB Aggregation Pipelines (Zero Mongoose .populate())
 */
export class BuyerOrderSubService {
  /**
   * Get buyer's orders with tab filtering (Active, Holds, Completed) and pagination
   */
  static async getMyOrders(buyerId: string, query: Record<string, unknown>) {
    const filter: Record<string, any> = {
      buyerId: new mongoose.Types.ObjectId(buyerId),
    };

    const tab = String(query.tab || '').toLowerCase();
    if (tab === 'holds') {
      filter.orderStatus = ENUM_ORDER_STATUS.HOLDING;
    } else if (tab === 'completed') {
      filter.orderStatus = ENUM_ORDER_STATUS.COMPLETED;
    } else if (tab === 'active') {
      filter.orderStatus = {
        $in: [
          ENUM_ORDER_STATUS.PENDING_PAYMENT, // unpaid checkout: app offers "Continue payment" / cancel
          ENUM_ORDER_STATUS.PLACED,
          ENUM_ORDER_STATUS.PROCESSING,
          ENUM_ORDER_STATUS.READY_FOR_PICKUP,
          ENUM_ORDER_STATUS.ACCEPTED,
        ],
      };
    }

    // `tab` is resolved above; QueryBuilder.filter() would otherwise match it as a field ({ tab: 'active' })
    const { tab: _tab, ...listQuery } = query;
    const queryBuilder = new QueryBuilder(OrderModel.find(filter), listQuery)
      .search(['orderNumber'])
      .filter()
      .sort()
      .paginate()
      .fields();

    const [data, meta] = await Promise.all([
      queryBuilder.modelQuery.lean(),
      queryBuilder.countTotal(),
    ]);

    return { data, meta };
  }

  /**
   * Get detailed order summary with pickup QR / 6-digit verification code & child items
   */
  static async getBuyerOrderDetails(buyerId: string, orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order ID format.');
    }

    const orderObjectId = new mongoose.Types.ObjectId(orderId);
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);

    const orders = await OrderModel.aggregate([
      {
        $match: {
          _id: orderObjectId,
          buyerId: buyerObjectId,
        },
      },
      {
        $lookup: {
          from: 'orderitems',
          localField: '_id',
          foreignField: 'orderId',
          as: 'items',
          pipeline: [
            {
              $lookup: {
                from: 'retailers',
                localField: 'retailerId',
                foreignField: '_id',
                as: 'retailer',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      address: 1,
                      phone: 1,
                      image: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: '$retailer', preserveNullAndEmptyArrays: true } },
          ],
        },
      },
    ]);

    if (!orders || orders.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Order not found.');
    }

    const order = orders[0];

    // Stored pickup code shown to the buyer as QR + 6 digits; older orders get one on first view
    const pickupVerificationCode = await OrderPickupVerificationSubService.ensurePickupCode(
      order._id,
      order.pickupVerificationCode
    );

    return {
      ...order,
      pickupVerificationCode,
    };
  }

  /**
   * Cancel an unfulfilled order or hold (Module 9.5 refund rules).
   * - Pending Payment: the Stripe checkout is closed, reserved stock returned, nothing charged.
   * - Paid order not yet accepted by any store: stock returned, full refund queued.
   * - Active hold: stock returned, deposit refunded when HOLD_DEPOSIT_RULES.refundOnBuyerCancel.
   * Cancellation and the refund record commit in one transaction; Stripe is called after commit.
   */
  static async cancelBuyerOrder(buyerId: string, orderId: string, reason?: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order ID format.');
    }

    const outcome = await runInTransaction(async (session) => {
      const order = await OrderModel.findOne({ _id: orderId, buyerId }).session(session);
      if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Order not found.');
      }

      if (order.orderStatus === ENUM_ORDER_STATUS.PENDING_PAYMENT) {
        await OrderPaymentFacadeService.cancelUnpaidOrderInTx(order, session);
        const payment = await OrderPaymentModel.findOne({ orderId: order._id })
          .sort({ createdAt: -1 })
          .select('stripeSessionId')
          .session(session)
          .lean();
        return { order, refund: null, stripeSessionId: payment?.stripeSessionId || null };
      }

      const cancellableItemStatuses = [ENUM_ORDER_ITEM_STATUS.PLACED, ENUM_ORDER_ITEM_STATUS.HOLDING];
      const items = await OrderItemModel.find({ orderId: order._id }).session(session);
      const blocked = items.some(
        (i) => i.status !== ENUM_ORDER_ITEM_STATUS.CANCELLED && !cancellableItemStatuses.includes(i.status)
      );
      const cancellableOrder = [ENUM_ORDER_STATUS.PLACED, ENUM_ORDER_STATUS.HOLDING].includes(order.orderStatus);
      if (!cancellableOrder || blocked) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Cannot cancel order with status '${order.orderStatus}'. The store has already started it, please contact store support.`
        );
      }

      // Compare-and-set so a double tap or a concurrent store action cannot cancel twice
      const claimed = await OrderModel.updateOne(
        { _id: order._id, orderStatus: order.orderStatus },
        { $set: { orderStatus: ENUM_ORDER_STATUS.CANCELLED } },
        { session }
      );
      if (!claimed.modifiedCount) {
        throw new AppError(StatusCodes.CONFLICT, 'Order status changed. Please refresh and try again.');
      }

      for (const item of items.filter((i) => cancellableItemStatuses.includes(i.status))) {
        await OrderInventorySubService.returnToStock(item, session);
        item.status = ENUM_ORDER_ITEM_STATUS.CANCELLED;
        await item.save({ session });
      }

      const isHold = order.orderStatus === ENUM_ORDER_STATUS.HOLDING;
      const refund =
        isHold && !HOLD_DEPOSIT_RULES.refundOnBuyerCancel
          ? null
          : await OrderPaymentFacadeService.queueRefund({
              orderId: order._id,
              reason: REFUND_REASON.BUYER_CANCELLED,
              refundKey: `buyer-cancel:${order._id}`,
              session,
            });
      return { order, refund, stripeSessionId: null };
    });

    if (outcome.stripeSessionId) {
      // Close the checkout so it cannot be paid; a payment that slips through is auto-refunded
      await OrderPaymentFacadeService.expireCheckoutSession(outcome.stripeSessionId);
    }
    if (outcome.refund?.paymentId) {
      await OrderPaymentFacadeService.processPaymentRefunds(outcome.refund.paymentId).catch((err) =>
        console.error('[REFUND] will retry via cron:', err)
      );
    }

    return {
      orderId: outcome.order._id,
      orderStatus: ENUM_ORDER_STATUS.CANCELLED,
      reason: reason || null,
      refundAmount: outcome.refund?.amount || 0,
      refundStatus: outcome.refund ? 'PENDING' : null,
      message: outcome.refund
        ? 'Order cancelled. Your refund has been issued to the original payment method.'
        : 'Order cancelled successfully. Any holds/reservations have been released.',
    };
  }
}
