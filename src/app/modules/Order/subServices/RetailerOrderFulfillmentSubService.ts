import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel, OrderModel } from '../Order.model';
import { OrderInventorySubService } from './OrderInventorySubService';
import OrderPaymentFacadeService from '../../OrderPayment/OrderPaymentFacadeService';
import { REFUND_REASON } from '../../OrderPayment/OrderPayment.constant';
import { runInTransaction } from '../../OrderPayment/OrderPayment.utils';
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS } from '../../../../utilities/enum';
import { BuyerLoyaltySubService } from '../../Buyer/subServices/BuyerLoyaltySubService';
import { BuyerReferralSubService } from '../../Buyer/subServices/BuyerReferralSubService';
import { RETAILER_ORDER_STAGE_STATUSES } from '../Order.constant';
import { RetailerStoreSettingsSubService } from '../../Retailer/subServices/RetailerStoreSettingsSubService';

/**
 * Sub-Service dedicated to Retailer Order Actions: Accept, Mark Ready, Complete, Cancel
 */
export class RetailerOrderFulfillmentSubService {
  /**
   * Retailer accepts an incoming order -> moves to Processing
   */
  static async acceptOrder(userDetails: IJwtPayload, orderItemId: string) {
    const { profileId } = userDetails;

    const orderItem = await OrderItemModel.findOneAndUpdate(
      {
        _id: orderItemId,
        retailerId: profileId,
        status: { $in: RETAILER_ORDER_STAGE_STATUSES.NEEDS_ACTION },
      },
      { $set: { status: ENUM_ORDER_ITEM_STATUS.PROCESSING, acceptedAt: new Date() } },
      { new: true }
    );

    if (!orderItem) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Order item not found or already processed.');
    }

    // Update parent order status if all items are processed
    await OrderModel.findByIdAndUpdate(orderItem.orderId, {
      $set: { orderStatus: ENUM_ORDER_STATUS.ACCEPTED },
    });

    return orderItem;
  }

  /**
   * Retailer marks packed order as Ready for in-store pickup / courier handover
   */
  static async markReady(userDetails: IJwtPayload, orderItemId: string) {
    const { profileId } = userDetails;

    // The buyer must collect within the store's configured pickup window
    const { pickupWindowHours } = await RetailerStoreSettingsSubService.getSettingsInternal(profileId);
    const readyAt = new Date();
    const pickupDeadline = new Date(readyAt.getTime() + pickupWindowHours * 60 * 60 * 1000);

    const orderItem = await OrderItemModel.findOneAndUpdate(
      {
        _id: orderItemId,
        retailerId: profileId,
        status: ENUM_ORDER_ITEM_STATUS.PROCESSING,
      },
      {
        $set: {
          status: ENUM_ORDER_ITEM_STATUS.READY_FOR_PICKUP,
          readyAt,
          pickupTime: pickupDeadline,
        },
      },
      { new: true }
    );

    if (!orderItem) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Order item not found in Processing stage.');
    }

    // Buyer screens read the parent orderStatus — keep it in sync (as accept/complete do)
    await OrderModel.findByIdAndUpdate(orderItem.orderId, {
      $set: { orderStatus: ENUM_ORDER_STATUS.READY_FOR_PICKUP },
    });

    return orderItem;
  }

  /**
   * Complete in-store pickup or delivery handover
   */
  static async completeOrder(userDetails: IJwtPayload, orderItemId: string) {
    const { profileId } = userDetails;

    const orderItem = await OrderItemModel.findOneAndUpdate(
      {
        _id: orderItemId,
        retailerId: profileId,
        // Holds are finalised via the hold-settlement flow (balance payment), not here
        status: { $in: RETAILER_ORDER_STAGE_STATUSES.READY },
      },
      { $set: { status: ENUM_ORDER_ITEM_STATUS.COMPLETED, completedAt: new Date() } },
      { new: true }
    );

    if (!orderItem) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Order item cannot be completed from current state.');
    }

    const parentOrder = await OrderModel.findByIdAndUpdate(
      orderItem.orderId,
      { $set: { orderStatus: ENUM_ORDER_STATUS.COMPLETED } },
      { new: true }
    );

    if (parentOrder && parentOrder.buyerId) {
      RetailerOrderFulfillmentSubService.awardCompletionRewards(parentOrder.buyerId, orderItem.orderId);
    }

    return orderItem;
  }

  /**
   * Fire-and-forget buyer rewards on completion: +90 VIP pts and the first-purchase referral reward.
   * Shared by manual completion and QR pickup verification.
   */
  static awardCompletionRewards(buyerId: mongoose.Types.ObjectId, orderId: mongoose.Types.ObjectId) {
    BuyerLoyaltySubService.awardPointsInternal(
      buyerId,
      90,
      "PURCHASE",
      "Order completion reward (+90 VIP pts)",
      orderId,
      "Order"
    ).catch(() => {});

    BuyerReferralSubService.processFirstPurchaseRewardInternal(buyerId, orderId).catch(() => {});
  }

  /**
   * Store cancels/rejects one order item: stock returned and the buyer refunded.
   * - Paid item: refund its price; when it is the last live item the remaining balance
   *   (shipping) is refunded too and the order becomes Cancelled.
   * - Held item: the deposit is always refunded (the store broke the hold, not the buyer).
   */
  static async cancelOrder(
    userDetails: IJwtPayload,
    orderItemId: string,
    reason: string = 'Cancelled by store'
  ) {
    const { profileId } = userDetails;

    const outcome = await runInTransaction(async (session) => {
      // Unpaid (Pending Payment) items are not the store's to cancel; they expire on their own
      const previous = await OrderItemModel.findOneAndUpdate(
        {
          _id: orderItemId,
          retailerId: profileId,
          status: {
            $nin: [
              ENUM_ORDER_ITEM_STATUS.COMPLETED,
              ENUM_ORDER_ITEM_STATUS.DELIVERED,
              ENUM_ORDER_ITEM_STATUS.CANCELLED,
              ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT,
            ],
          },
        },
        { $set: { status: ENUM_ORDER_ITEM_STATUS.CANCELLED } },
        { new: false, session }
      );

      if (!previous) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Order item not found to cancel.');
      }

      // Uses the status BEFORE cancelling to know whether the pair was still reserved
      await OrderInventorySubService.returnToStock(previous, session);

      const liveItems = await OrderItemModel.countDocuments({
        orderId: previous.orderId,
        status: { $ne: ENUM_ORDER_ITEM_STATUS.CANCELLED },
      }).session(session);
      const isLastItem = liveItems === 0;
      const wasHold = previous.status === ENUM_ORDER_ITEM_STATUS.HOLDING;

      if (isLastItem) {
        await OrderModel.updateOne(
          { _id: previous.orderId },
          { $set: { orderStatus: ENUM_ORDER_STATUS.CANCELLED } },
          { session }
        );
      }

      const refund = await OrderPaymentFacadeService.queueRefund({
        orderId: previous.orderId,
        // Last item / hold: everything still refundable. Otherwise just this item's price.
        amount: isLastItem || wasHold ? undefined : previous.totalPrice,
        reason: REFUND_REASON.STORE_CANCELLED,
        refundKey: `store-cancel:${previous._id}`,
        session,
      });

      return { orderItemId: previous._id, orderId: previous.orderId, refund };
    });

    if (outcome.refund?.paymentId) {
      await OrderPaymentFacadeService.processPaymentRefunds(outcome.refund.paymentId).catch((err) =>
        console.error('[REFUND] will retry via cron:', err)
      );
    }

    const orderItem = await OrderItemModel.findById(outcome.orderItemId).lean();
    return {
      ...orderItem,
      cancelReason: reason,
      refundAmount: outcome.refund?.amount || 0,
      refundStatus: outcome.refund ? 'PENDING' : null,
    };
  }
}
