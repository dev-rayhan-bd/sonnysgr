import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { OrderModel } from "../../Order/Order.model";
import OfferModel from "../../Offer/Offer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import StoreVisitModel from "../storeVisit/StoreVisit.model";
import { TStoreVisitType } from "../storeVisit/StoreVisit.interface";
import { ENUM_ORDER_STATUS } from "../../../../utilities/enum";

/**
 * Sub-Service dedicated to Buyer Purchase History (Module 1.8)
 * and Physical Store Visit Footprint Engine (Module 1.9)
 * Strictly uses native MongoDB Aggregation Pipelines (Zero Mongoose .populate() — Rule 4)
 */
export class BuyerHistorySubService {
  /**
   * Get comprehensive purchase history log: online orders, in-store pickups & trade-in drop-offs (Module 1.8)
   */
  static async getPurchaseHistory(buyerId: string, query: Record<string, unknown> = {}) {
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);

    // 1. Fetch completed & active purchase orders via native aggregation
    const orders = await OrderModel.aggregate([
      {
        $match: {
          buyerId: buyerObjectId,
          orderStatus: {
            $in: [
              ENUM_ORDER_STATUS.COMPLETED,
              ENUM_ORDER_STATUS.PLACED,
              ENUM_ORDER_STATUS.PROCESSING,
              ENUM_ORDER_STATUS.READY_FOR_PICKUP,
              "DELIVERED",
            ],
          },
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
                    },
                  },
                ],
              },
            },
            { $unwind: { path: "$retailer", preserveNullAndEmptyArrays: true } },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // 2. Fetch C2B Trade-in payouts from Locker / Sell-to-Store (Module 21)
    const tradeInDrops = await OfferModel.aggregate([
      {
        $match: {
          sellerId: buyerObjectId,
          status: "Completed",
        },
      },
      {
        $lookup: {
          from: "retailers",
          localField: "buyerStoreId",
          foreignField: "_id",
          as: "store",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                address: 1,
                image: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "lockers",
          localField: "targetItemId",
          foreignField: "_id",
          as: "sneaker",
          pipeline: [
            {
              $project: {
                _id: 1,
                sneakerName: 1,
                brand: 1,
                size: 1,
                images: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$sneaker", preserveNullAndEmptyArrays: true } },
      { $sort: { updatedAt: -1 } },
    ]);

    // Calculate Financial Summary
    let totalSpent = 0;
    let totalItemsBought = 0;

    const formattedOrders = orders.map((order: any) => {
      totalSpent += order.totalAmount || 0;
      totalItemsBought += order.totalItems || order.items?.length || 1;

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        shippingCharge: order.shippingCharge,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        partialDepositPaid: order.partialPayment || 0,
        pickupVerificationCode: order.pickupVerificationCode,
        shippingAddress: order.shippingAddress,
        itemsCount: order.items?.length || 0,
        items: order.items,
        date: order.createdAt,
      };
    });

    let totalTradeInEarnings = 0;
    const formattedTradeIns = tradeInDrops.map((drop: any) => {
      const payout = drop.netSellerPayout || drop.currentOfferAmount || 0;
      totalTradeInEarnings += payout;

      return {
        _id: drop._id,
        offerId: drop._id,
        sneakerName: drop.sneaker?.sneakerName || "Sneaker Pair",
        brand: drop.sneaker?.brand || "",
        size: drop.sneaker?.size || "",
        image: drop.sneaker?.images?.[0] || "",
        payoutAmount: payout,
        store: drop.store,
        dropoffCode: drop.dropoffVerificationCode,
        completedAt: drop.updatedAt,
      };
    });

    return {
      summary: {
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalSneakersPurchased: totalItemsBought,
        totalOrdersCount: orders.length,
        totalTradeInsCompleted: tradeInDrops.length,
        totalTradeInEarnings: Math.round(totalTradeInEarnings * 100) / 100,
      },
      purchaseOrders: formattedOrders,
      tradeInPayouts: formattedTradeIns,
    };
  }

  /**
   * Log physical store visit internally (called upon in-store pickup or drop-off)
   */
  static async logStoreVisitInternal(
    buyerId: string | mongoose.Types.ObjectId,
    retailerId: string | mongoose.Types.ObjectId,
    visitType: TStoreVisitType,
    referenceId?: string | mongoose.Types.ObjectId,
    referenceModel?: "Order" | "Offer"
  ) {
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const retailerObjectId = new mongoose.Types.ObjectId(retailerId);

    await StoreVisitModel.findOneAndUpdate(
      { buyerId: buyerObjectId, retailerId: retailerObjectId },
      {
        $inc: { visitCount: 1 },
        $set: {
          lastVisitedAt: new Date(),
          visitType,
          verified: true,
          ...(referenceId ? { referenceId: new mongoose.Types.ObjectId(referenceId) } : {}),
          ...(referenceModel ? { referenceModel } : {}),
        },
        $setOnInsert: {
          firstVisitedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * In-Store QR Code Scan / Physical Location Check-in (Module 1.9)
   */
  static async recordQrCheckin(
    buyerId: string,
    payload: { retailerId: string; branchId?: string; notes?: string }
  ) {
    const { retailerId, branchId, notes } = payload;

    if (!retailerId || !mongoose.Types.ObjectId.isValid(retailerId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Valid retailer ID is required for check-in.");
    }

    const retailer = (await RetailerModel.findById(retailerId).select("name address image location").lean()) as any;
    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer store not found.");
    }

    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const retailerObjectId = new mongoose.Types.ObjectId(retailerId);

    const visit = await StoreVisitModel.findOneAndUpdate(
      { buyerId: buyerObjectId, retailerId: retailerObjectId },
      {
        $inc: { visitCount: 1 },
        $set: {
          lastVisitedAt: new Date(),
          visitType: "QR_CHECKIN",
          verified: true,
          ...(branchId && mongoose.Types.ObjectId.isValid(branchId)
            ? { branchId: new mongoose.Types.ObjectId(branchId) }
            : {}),
          ...(notes ? { notes } : {}),
        },
        $setOnInsert: {
          firstVisitedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return {
      message: `Checked in successfully at ${retailer.name}!`,
      store: retailer,
      visitCount: visit?.visitCount || 1,
      lastVisitedAt: visit?.lastVisitedAt || new Date(),
    };
  }

  /**
   * Get customer's physical store visit footprint history (Module 1.9)
   */
  static async getStoreVisitHistory(buyerId: string) {
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);

    const visits = await StoreVisitModel.aggregate([
      { $match: { buyerId: buyerObjectId } },
      {
        $lookup: {
          from: "retailers",
          localField: "retailerId",
          foreignField: "_id",
          as: "store",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                image: 1,
                address: 1,
                phone: 1,
                averageRating: 1,
                location: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
      { $sort: { lastVisitedAt: -1 } },
    ]);

    const totalPhysicalVisits = visits.reduce((sum, v) => sum + (v.visitCount || 1), 0);

    return {
      summary: {
        totalUniqueStoresVisited: visits.length,
        totalPhysicalVisits,
      },
      visitedStores: visits.map((v: any) => ({
        _id: v._id,
        retailerId: v.retailerId,
        storeName: v.store?.name || "Local Boutique",
        storeImage: v.store?.image || "",
        storeAddress: v.store?.address || "",
        storeRating: v.store?.averageRating || 5.0,
        visitCount: v.visitCount,
        lastVisitType: v.visitType,
        verified: v.verified,
        firstVisitedAt: v.firstVisitedAt,
        lastVisitedAt: v.lastVisitedAt,
      })),
    };
  }
}
