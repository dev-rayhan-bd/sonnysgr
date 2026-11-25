import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel, OrderModel } from '../Order.model';
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS, ENUM_ORDER_TYPE } from '../../../../utilities/enum';
import { RETAILER_ORDER_STAGE_STATUSES, generatePickupCode, normalisePickupCode } from '../Order.constant';
import { RetailerOrderFulfillmentSubService } from './RetailerOrderFulfillmentSubService';

/** Item statuses after which nothing is left to hand over. */
const CLOSED_ITEM_STATUSES = [
  ENUM_ORDER_ITEM_STATUS.COMPLETED,
  ENUM_ORDER_ITEM_STATUS.DELIVERED,
  ENUM_ORDER_ITEM_STATUS.CANCELLED,
  ENUM_ORDER_ITEM_STATUS.REJECTED,
];

/**
 * Sub-Service for the in-store "Verify Pickup" tool (REQUIREMENTS 10.2):
 * the buyer shows a QR / 6-digit code, the retailer scans it, and only then is the order released.
 */
export class OrderPickupVerificationSubService {
  /**
   * Orders placed before pickup codes were stored have none; give them one the first time the
   * buyer opens the order so the QR can be shown.
   */
  static async ensurePickupCode(orderId: mongoose.Types.ObjectId | string, current?: string) {
    if (current) return current;
    const code = generatePickupCode();
    await OrderModel.updateOne(
      { _id: orderId, $or: [{ pickupVerificationCode: { $exists: false } }, { pickupVerificationCode: null }, { pickupVerificationCode: '' }] },
      { $set: { pickupVerificationCode: code } }
    );
    const order = await OrderModel.findById(orderId).select('pickupVerificationCode').lean<{ pickupVerificationCode?: string }>();
    return order?.pickupVerificationCode || code;
  }

  /**
   * Retailer scans the buyer's code → this store's ready items in that order are marked Completed.
   * The parent order is Completed once no item from any store is still open.
   */
  static async verifyPickup(userDetails: IJwtPayload, rawCode: string) {
    const { profileId } = userDetails;
    const code = normalisePickupCode(rawCode);
    const retailerId = new mongoose.Types.ObjectId(profileId);

    const order = await OrderModel.findOne({ pickupVerificationCode: code })
      .select('_id buyerId orderNumber orderType orderStatus')
      .lean<{ _id: mongoose.Types.ObjectId; buyerId: mongoose.Types.ObjectId; orderNumber: string; orderType: string; orderStatus: string }>();

    if (!order) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Invalid pickup code.');
    }

    if (order.orderType === ENUM_ORDER_TYPE.HOLD) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'This is a hold reservation. Use POST /order/settle-hold to collect the balance and release it.'
      );
    }

    const storeItems = await OrderItemModel.find({ orderId: order._id, retailerId })
      .select('_id status')
      .lean<{ _id: mongoose.Types.ObjectId; status: string }[]>();

    // Same message as an unknown code: a store must not learn about other stores' orders
    if (!storeItems.length) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Invalid pickup code.');
    }

    const readyIds = storeItems
      .filter((i) => RETAILER_ORDER_STAGE_STATUSES.READY.includes(i.status))
      .map((i) => i._id);

    if (!readyIds.length) {
      if (storeItems.every((i) => i.status === ENUM_ORDER_ITEM_STATUS.COMPLETED)) {
        throw new AppError(StatusCodes.CONFLICT, 'This order has already been picked up.');
      }
      const statuses = [...new Set(storeItems.map((i) => i.status))].join(', ');
      throw new AppError(StatusCodes.BAD_REQUEST, `Order is not ready for pickup (status: ${statuses}).`);
    }

    const session = await mongoose.startSession();
    let orderStatus = order.orderStatus;
    try {
      await session.withTransaction(async () => {
        await OrderItemModel.updateMany(
          { _id: { $in: readyIds }, status: { $in: RETAILER_ORDER_STAGE_STATUSES.READY } },
          { $set: { status: ENUM_ORDER_ITEM_STATUS.COMPLETED, completedAt: new Date() } },
          { session }
        );

        const stillOpen = await OrderItemModel.countDocuments({
          orderId: order._id,
          status: { $nin: CLOSED_ITEM_STATUSES },
        }).session(session);

        orderStatus = stillOpen === 0 ? ENUM_ORDER_STATUS.COMPLETED : ENUM_ORDER_STATUS.PARTIALLY_DELIVERED;
        await OrderModel.updateOne({ _id: order._id }, { $set: { orderStatus } }, { session });
      });
    } finally {
      await session.endSession();
    }

    if (order.buyerId) {
      RetailerOrderFulfillmentSubService.awardCompletionRewards(order.buyerId, order._id);
    }

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      completedItems: readyIds.length,
      orderStatus,
    };
  }
}
