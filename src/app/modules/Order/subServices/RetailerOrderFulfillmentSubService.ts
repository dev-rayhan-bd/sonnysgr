import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel, OrderModel } from '../Order.model';
import { ProductInventorySubService } from '../../Product/subServices/ProductInventorySubService';
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS } from '../../../../utilities/enum';
import { BuyerLoyaltySubService } from '../../Buyer/subServices/BuyerLoyaltySubService';
import { BuyerReferralSubService } from '../../Buyer/subServices/BuyerReferralSubService';

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
        status: { $in: ['Placed', 'Pending', 'Payment_Completed', 'Needs Action'] },
      },
      { $set: { status: ENUM_ORDER_ITEM_STATUS.PROCESSING } },
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

    const orderItem = await OrderItemModel.findOneAndUpdate(
      {
        _id: orderItemId,
        retailerId: profileId,
        status: ENUM_ORDER_ITEM_STATUS.PROCESSING,
      },
      { $set: { status: 'Ready_For_Pickup' } },
      { new: true }
    );

    if (!orderItem) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Order item not found in Processing stage.');
    }

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
        status: { $in: ['Ready_For_Pickup', 'Processing', 'Hold', 'On Hold'] },
      },
      { $set: { status: ENUM_ORDER_ITEM_STATUS.COMPLETED } },
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
      BuyerLoyaltySubService.awardPointsInternal(
        parentOrder.buyerId,
        90,
        "PURCHASE",
        "Order completion reward (+90 VIP pts)",
        orderItem.orderId,
        "Order"
      ).catch(() => {});

      BuyerReferralSubService.processFirstPurchaseRewardInternal(
        parentOrder.buyerId,
        orderItem.orderId
      ).catch(() => {});
    }

    return orderItem;
  }

  /**
   * Cancel order and atomically return reserved stock to product
   */
  static async cancelOrder(
    userDetails: IJwtPayload,
    orderItemId: string,
    reason: string = 'Cancelled by store'
  ) {
    const { profileId } = userDetails;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const orderItem = await OrderItemModel.findOneAndUpdate(
        {
          _id: orderItemId,
          retailerId: profileId,
          status: { $nin: ['Completed', 'Cancelled'] },
        },
        { $set: { status: ENUM_ORDER_ITEM_STATUS.CANCELLED } },
        { new: true, session }
      );

      if (!orderItem) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Order item not found to cancel.');
      }

      // Restore inventory stock atomically
      if (orderItem.productId && orderItem.selectedSize) {
        await ProductInventorySubService.adjustSizeStock(
          String(orderItem.productId),
          String(orderItem.selectedSize),
          orderItem.quantity,
          0,
          session
        );
      }

      await session.commitTransaction();
      return orderItem;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

