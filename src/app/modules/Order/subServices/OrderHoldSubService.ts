import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { OrderItemModel, OrderModel } from "../Order.model";
import { OrderInventorySubService } from "./OrderInventorySubService";
import OrderPaymentModel from "../../OrderPayment/OrderPayment.model";
import { ORDER_PAYMENT_STATUS, ORDER_PAYMENT_TYPE } from "../../OrderPayment/OrderPayment.constant";
import { runInTransaction } from "../../OrderPayment/OrderPayment.utils";
import { BuyerHistorySubService } from "../../Buyer/subServices/BuyerHistorySubService";
import { BuyerLoyaltySubService } from "../../Buyer/subServices/BuyerLoyaltySubService";
import { BuyerReferralSubService } from "../../Buyer/subServices/BuyerReferralSubService";
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
  // Hold creation (deposit checkout) lives in OrderPayment/PendingOrderSubService +
  // PaymentSettlementSubService: a hold only becomes HOLDING after Stripe confirms the deposit.

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
        await OrderInventorySubService.commitReservation(item, session);

        item.status = ENUM_ORDER_ITEM_STATUS.COMPLETED;
        item.completedAt = new Date();
        await item.save({ session });
      }

      order.orderStatus = ENUM_ORDER_STATUS.COMPLETED;
      order.paymentStatus = ENUM_PAYMENT_STATUS.PAID;
      order.balancePaymentMethod = paymentMethod; // paymentMethod stays Stripe (the deposit)
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

      // Module 13.2 & 13.4: Award +90 VIP points and process referral first purchase reward
      BuyerLoyaltySubService.awardPointsInternal(
        order.buyerId,
        90,
        "PURCHASE",
        "Order completion reward (+90 VIP pts)",
        order._id,
        "Order"
      ).catch(() => {});

      BuyerReferralSubService.processFirstPurchaseRewardInternal(
        order.buyerId,
        order._id
      ).catch(() => {});

      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        depositDeducted: depositPaid,
        balanceCollectedAtCounter,
        balancePaymentMethod: paymentMethod,
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
   * Release expired holds (no-show) and return locked stock to inventory.
   * Module 9.5: the paid deposit is forfeited. Each hold is released in its own transaction with
   * a compare-and-set on HOLDING, so it can never race an in-store settlement.
   */
  static async releaseExpiredHolds() {
    const expiredOrders = await OrderModel.find({
      orderType: ENUM_ORDER_TYPE.HOLD,
      orderStatus: ENUM_ORDER_STATUS.HOLDING,
      holdingEndTime: { $lte: new Date() },
    })
      .select("_id")
      .lean();

    let releasedCount = 0;
    for (const { _id } of expiredOrders) {
      try {
        const released = await runInTransaction(async (session) => {
          const order = await OrderModel.findOneAndUpdate(
            { _id, orderStatus: ENUM_ORDER_STATUS.HOLDING, holdingEndTime: { $lte: new Date() } },
            { $set: { orderStatus: ENUM_ORDER_STATUS.CANCELLED } },
            { new: true, session }
          );
          if (!order) return false;

          const items = await OrderItemModel.find({
            orderId: order._id,
            status: ENUM_ORDER_ITEM_STATUS.HOLDING,
          }).session(session);
          for (const item of items) {
            await OrderInventorySubService.returnToStock(item, session);
            item.status = ENUM_ORDER_ITEM_STATUS.CANCELLED;
            await item.save({ session });
          }

          await OrderPaymentModel.updateMany(
            { orderId: order._id, paymentType: ORDER_PAYMENT_TYPE.HOLD_DEPOSIT, status: ORDER_PAYMENT_STATUS.SUCCESS },
            { $set: { depositForfeitedAt: new Date() } },
            { session }
          );
          return true;
        });
        if (released) releasedCount++;
      } catch (error) {
        console.error(`[HOLD] failed to release expired hold ${_id}:`, error);
      }
    }

    return { releasedCount };
  }
}
