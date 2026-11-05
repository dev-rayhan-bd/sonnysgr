import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import { OrderItemModel, OrderModel } from "../Order.model";
import { ProductModel } from "../../Product/Product.model";
import { ProductInventorySubService } from "../../Product/subServices/ProductInventorySubService";
import { BuyerHistorySubService } from "../../Buyer/subServices/BuyerHistorySubService";
import {
  ENUM_ORDER_ITEM_STATUS,
  ENUM_ORDER_STATUS,
  ENUM_ORDER_TYPE,
  ENUM_PAYMENT_STATUS,
} from "../../../../utilities/enum";

/**
 * Sub-Service dedicated to Deposit-backed Holds, Real-Time Countdown & In-Store Settlement
 * Module 9: Hold & Reservation Engine
 */
export class OrderHoldSubService {
  /**
   * Create a deposit-backed hold reservation with countdown timer (3h to 24h)
   */
  static async holdOrder(
    userDetails: IJwtPayload,
    payload: {
      retailerId: string;
      productId: string;
      selectedSize: number | string;
      quantity?: number;
      unitPrice?: number;
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
      holdingTimeHours = 3, // Default 3 hours for high-demand sneaker drops
      partialDepositAmount,
      shippingAddress,
    } = payload;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const product = (await ProductModel.findById(productId).session(session)) as any;
      if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, "Sneaker not found for hold reservation.");
      }

      const sizeStr = String(selectedSize);
      const variant = product.variant?.find((v: any) => String(v.size) === sizeStr);

      if (!variant || variant.stock < quantity) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Insufficient stock in size ${sizeStr} to create a hold reservation.`
        );
      }

      const unitPrice = payload.unitPrice || variant.price || product.price;
      const totalAmount = unitPrice * quantity;

      // Deposit calculation: e.g. Flat $30 or 20% of total
      const deposit = partialDepositAmount || Math.min(30, Math.round(totalAmount * 0.2 * 100) / 100);
      const remainingBalance = Math.max(0, totalAmount - deposit);

      const holdStart = new Date();
      const holdEnd = new Date(holdStart.getTime() + holdingTimeHours * 60 * 60 * 1000);

      const timestamp = Date.now().toString().slice(-6);
      const orderNumber = `GS-HOLD-${timestamp}-${Math.floor(100 + Math.random() * 900)}`;
      const pickupVerificationCode = `GS-HOLD-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Create Parent Hold Order Record
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
            paymentStatus: ENUM_PAYMENT_STATUS.PAID, // Deposit paid
            holdingTime: holdingTimeHours,
            holdingStartTime: holdStart,
            holdingEndTime: holdEnd,
            partialPayment: deposit,
            pickupVerificationCode,
            pickupTime: holdEnd,
            shippingAddress: shippingAddress || {
              name: "In-Store Boutique Hold",
              phone: "N/A",
              address: "Local Store Pickup & Settlement",
              city: "Local",
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
              image: product.images?.[0] || "",
              brand: product.brand,
            },
            selectedSize: sizeStr,
            quantity,
            unitPrice,
            totalPrice: totalAmount,
            status: ENUM_ORDER_ITEM_STATUS.HOLDING,
            pickupTime: holdEnd,
          },
        ],
        { session }
      );

      // 3. Atomically lock size stock (decrement live stock, increment reservedStock)
      await ProductInventorySubService.adjustSizeStock(
        productId,
        sizeStr,
        -quantity,
        quantity,
        session
      );

      await session.commitTransaction();

      return {
        order,
        orderItem,
        reservation: {
          orderNumber,
          pickupVerificationCode,
          depositPaid: deposit,
          remainingBalanceAtCounter: remainingBalance,
          holdingHours: holdingTimeHours,
          expiresAt: holdEnd,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get buyer's active holds with live countdown timers and remaining balances
   */
  static async getMyActiveHolds(buyerId: string) {
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const now = Date.now();

    const holds = await OrderModel.aggregate([
      {
        $match: {
          buyerId: buyerObjectId,
          orderType: ENUM_ORDER_TYPE.HOLD,
          orderStatus: ENUM_ORDER_STATUS.HOLDING,
        },
      },
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "orderId",
          as: "items",
          pipeline: [
            {
              $lookup: {
                from: "retailers",
                localField: "retailerId",
                foreignField: "_id",
                as: "retailer",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      address: 1,
                      image: 1,
                      phone: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: "$retailer", preserveNullAndEmptyArrays: true } },
          ],
        },
      },
      { $sort: { holdingEndTime: 1 } },
    ]);

    const formattedHolds = holds.map((hold: any) => {
      const endTime = hold.holdingEndTime ? new Date(hold.holdingEndTime).getTime() : now;
      const remainingMs = Math.max(0, endTime - now);
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const isExpired = remainingMs <= 0;

      const depositPaid = hold.partialPayment || 0;
      const remainingBalance = Math.max(0, hold.totalAmount - depositPaid);

      return {
        _id: hold._id,
        orderNumber: hold.orderNumber,
        pickupVerificationCode: hold.pickupVerificationCode,
        totalAmount: hold.totalAmount,
        depositPaid,
        remainingBalanceToPay: remainingBalance,
        holdingStartTime: hold.holdingStartTime,
        holdingEndTime: hold.holdingEndTime,
        countdown: {
          remainingMs,
          remainingHours,
          remainingMinutes,
          formatted: isExpired ? "Expired" : `Expires in ${remainingHours}h ${remainingMinutes}m`,
          isExpired,
        },
        items: hold.items,
      };
    });

    return formattedHolds;
  }

  /**
   * Retailer In-Store Verification & Final Settlement (Deducts deposit, completes order)
   */
  static async settleInStoreHoldOrder(
    retailerId: string,
    payload: { pickupVerificationCode?: string; orderId?: string; paymentMethod?: string }
  ) {
    const { pickupVerificationCode, orderId, paymentMethod = "IN_STORE_CASH" } = payload;

    if (!pickupVerificationCode && !orderId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "pickupVerificationCode or orderId is required.");
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const query: any = { orderType: ENUM_ORDER_TYPE.HOLD };
      if (pickupVerificationCode) query.pickupVerificationCode = pickupVerificationCode.trim();
      if (orderId) query._id = new mongoose.Types.ObjectId(orderId);

      const order = await OrderModel.findOne(query).session(session);
      if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Hold reservation not found with the provided code.");
      }

      if (order.orderStatus !== ENUM_ORDER_STATUS.HOLDING) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Cannot settle order with status '${order.orderStatus}'. Only 'HOLDING' orders can be settled.`
        );
      }

      if (order.holdingEndTime && new Date(order.holdingEndTime).getTime() < Date.now()) {
        throw new AppError(StatusCodes.BAD_REQUEST, "This hold reservation has expired.");
      }

      const items = await OrderItemModel.find({
        orderId: order._id,
        retailerId: new mongoose.Types.ObjectId(retailerId),
      }).session(session);

      if (!items.length) {
        throw new AppError(StatusCodes.FORBIDDEN, "This hold order does not belong to your store.");
      }

      // Calculate in-store balance
      const depositPaid = order.partialPayment || 0;
      const balanceCollectedAtCounter = Math.max(0, order.totalAmount - depositPaid);

      // Permanently finalize reserved stock
      for (const item of items) {
        await ProductInventorySubService.adjustSizeStock(
          String(item.productId),
          String(item.selectedSize),
          0,
          -item.quantity, // Release reserved stock
          session
        );

        item.status = ENUM_ORDER_ITEM_STATUS.COMPLETED;
        await item.save({ session });
      }

      order.orderStatus = ENUM_ORDER_STATUS.COMPLETED;
      order.paymentStatus = ENUM_PAYMENT_STATUS.PAID;
      order.paymentMethod = paymentMethod;
      await order.save({ session });

      await session.commitTransaction();

      // Module 1.9: Log physical store visit for in-store pickup
      BuyerHistorySubService.logStoreVisitInternal(
        order.buyerId,
        retailerId,
        "IN_STORE_PICKUP",
        order._id,
        "Order"
      ).catch(() => {});

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        depositDeducted: depositPaid,
        balanceCollectedAtCounter,
        orderStatus: ENUM_ORDER_STATUS.COMPLETED,
        message: "In-store hold verified and settled successfully.",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release expired holds automatically and return locked stock to inventory
   */
  static async releaseExpiredHolds() {
    const now = new Date();
    const expiredOrders = await OrderModel.find({
      orderType: ENUM_ORDER_TYPE.HOLD,
      orderStatus: ENUM_ORDER_STATUS.HOLDING,
      holdingEndTime: { $lte: now },
    });

    let releasedCount = 0;

    for (const order of expiredOrders) {
      const items = await OrderItemModel.find({ orderId: order._id });
      for (const item of items) {
        // Return reserved stock to available stock
        await ProductInventorySubService.adjustSizeStock(
          String(item.productId),
          String(item.selectedSize),
          item.quantity, // restore stock
          -item.quantity // clear reserved stock
        );
        item.status = ENUM_ORDER_ITEM_STATUS.CANCELLED;
        await item.save();
      }

      order.orderStatus = ENUM_ORDER_STATUS.CANCELLED;
      await order.save();
      releasedCount++;
    }

    return { releasedCount };
  }
}
