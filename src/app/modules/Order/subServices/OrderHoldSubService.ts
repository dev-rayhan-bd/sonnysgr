import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel, OrderModel } from '../Order.model';
import { ProductModel } from '../../Product/Product.model';
import { ProductInventorySubService } from '../../Product/subServices/ProductInventorySubService';
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS, ENUM_ORDER_TYPE, ENUM_PAYMENT_STATUS } from '../../../../utilities/enum';

/**
 * Sub-Service dedicated to Deposit-backed Holds and TTL Expiration
 */
export class OrderHoldSubService {
  /**
   * Create a deposit-backed hold reservation with countdown timer
   */
  static async holdOrder(
    userDetails: IJwtPayload,
    payload: {
      retailerId: string;
      productId: string;
      selectedSize: number;
      quantity: number;
      unitPrice: number;
      holdingTimeHours?: number;
      partialDepositAmount?: number;
      shippingAddress?: any;
    }
  ) {
    const { profileId } = userDetails;
    const {
      retailerId,
      productId,
      selectedSize,
      quantity = 1,
      unitPrice,
      holdingTimeHours = 24,
      partialDepositAmount,
      shippingAddress,
    } = payload;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Check stock
      const product = await ProductModel.findById(productId).session(session);
      if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Product not found for hold reservation.');
      }

      const variant = product.variant.find((v: any) => String(v.size) === String(selectedSize));
      if (!variant || variant.stock < quantity) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Insufficient size stock for hold reservation.');
      }

      const holdStart = new Date();
      const holdEnd = new Date(holdStart.getTime() + holdingTimeHours * 60 * 60 * 1000);
      const deposit = partialDepositAmount || Math.round(unitPrice * quantity * 0.2); // Default 20% deposit
      const totalAmount = unitPrice * quantity;
      const orderNumber = `GS-${Date.now().toString().slice(-6)}`;

      // 1. Create Parent Hold Order
      const [order] = await OrderModel.create(
        [
          {
            buyerId: new mongoose.Types.ObjectId(profileId),
            orderNumber,
            subtotal: totalAmount,
            shippingCharge: 0,
            discountAmount: 0,
            totalAmount,
            totalItems: quantity,
            orderStatus: ENUM_ORDER_STATUS.HOLDING,
            orderType: ENUM_ORDER_TYPE.HOLD,
            paymentStatus: ENUM_PAYMENT_STATUS.PAID,
            holdingTime: holdingTimeHours,
            holdingStartTime: holdStart,
            holdingEndTime: holdEnd,
            partialPayment: deposit,
            pickupTime: holdEnd,
            shippingAddress: shippingAddress || {
              name: 'In-Store Hold',
              phone: 'N/A',
              address: 'Local Boutique Pickup',
              city: 'Local',
              lat: 0,
              lng: 0,
            },
          },
        ],
        { session }
      );

      // 2. Create Order Item under retailer
      const [orderItem] = await OrderItemModel.create(
        [
          {
            orderId: order._id,
            buyerId: new mongoose.Types.ObjectId(profileId),
            retailerId: new mongoose.Types.ObjectId(retailerId),
            productId: new mongoose.Types.ObjectId(productId),
            productSnapshot: {
              name: product.name,
              image: product.images[0] || '',
              brand: product.brand,
            },
            selectedSize,
            quantity,
            unitPrice,
            totalPrice: totalAmount,
            status: ENUM_ORDER_ITEM_STATUS.HOLDING,
            pickupTime: holdEnd,
          },
        ],
        { session }
      );

      // 3. Atomically lock size stock
      await ProductInventorySubService.adjustSizeStock(
        productId,
        String(selectedSize),
        -quantity,
        quantity,
        session
      );

      await session.commitTransaction();
      return { order, orderItem };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release expired holds automatically
   */
  static async releaseExpiredHolds() {
    const now = new Date();
    const expiredOrders = await OrderModel.find({
      orderType: ENUM_ORDER_TYPE.HOLD,
      orderStatus: ENUM_ORDER_STATUS.HOLDING,
      holdingEndTime: { $lte: now },
    });

    for (const order of expiredOrders) {
      const items = await OrderItemModel.find({ orderId: order._id });
      for (const item of items) {
        await ProductInventorySubService.adjustSizeStock(
          String(item.productId),
          String(item.selectedSize),
          item.quantity,
          -item.quantity
        );
        item.status = ENUM_ORDER_ITEM_STATUS.CANCELLED;
        await item.save();
      }
      order.orderStatus = ENUM_ORDER_STATUS.CANCELLED;
      await order.save();
    }
  }
}

