import mongoose from 'mongoose';
import { OrderItemModel, OrderModel } from '../Order.model';
import QueryBuilder from '../../../builder/QueryBuilder';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS } from '../../../../utilities/enum';
import { ProductInventorySubService } from '../../Product/subServices/ProductInventorySubService';

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
          ENUM_ORDER_STATUS.PLACED,
          ENUM_ORDER_STATUS.PROCESSING,
          ENUM_ORDER_STATUS.READY_FOR_PICKUP,
          ENUM_ORDER_STATUS.ACCEPTED,
        ],
      };
    }

    const queryBuilder = new QueryBuilder(OrderModel.find(filter), query)
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

    // Build pickup code from order number if in-store pickup
    const pickupVerificationCode =
      order.orderType === 'HOLD' || order.shippingAddress?.address?.includes('Pickup')
        ? `GS-PICKUP-${order.orderNumber.replace(/[^0-9]/g, '').slice(-6) || '928374'}`
        : undefined;

    return {
      ...order,
      pickupVerificationCode,
    };
  }

  /**
   * Cancel unfulfilled order or hold according to store refund rules
   */
  static async cancelBuyerOrder(buyerId: string, orderId: string, reason?: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order ID format.');
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const order = await OrderModel.findOne({
        _id: orderId,
        buyerId,
      }).session(session);

      if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Order not found.');
      }

      const cancellableStatuses = [
        ENUM_ORDER_STATUS.PLACED,
        ENUM_ORDER_STATUS.HOLDING,
      ];

      if (!cancellableStatuses.includes(order.orderStatus as any)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Cannot cancel order with status '${order.orderStatus}'. Please contact store support.`
        );
      }

      // Return reserved inventory
      const items = await OrderItemModel.find({ orderId: order._id }).session(session);
      for (const item of items) {
        await ProductInventorySubService.adjustSizeStock(
          String(item.productId),
          String(item.selectedSize),
          item.quantity,
          0,
          session
        );

        item.status = ENUM_ORDER_ITEM_STATUS.CANCELLED;
        await item.save({ session });
      }

      order.orderStatus = ENUM_ORDER_STATUS.CANCELLED;
      await order.save({ session });

      await session.commitTransaction();

      return {
        orderId: order._id,
        orderStatus: ENUM_ORDER_STATUS.CANCELLED,
        message: 'Order cancelled successfully. Any holds/reservations have been released.',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
