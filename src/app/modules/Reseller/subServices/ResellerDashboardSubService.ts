import mongoose, { Types } from "mongoose";
import { PairsModel, PairRequestModel } from "../../Pairs/Pairs.model";
import ResellerModel from "../Reseller.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";

export class ResellerDashboardSubService {
  /**
   * Reseller Homepage & Analytics Summary (Native Aggregation, No .populate())
   */
  static async getDashboardMetrics(user: IJwtPayload) {
    const resellerObjectId = new Types.ObjectId(user.profileId);

    const reseller = (await ResellerModel.findById(resellerObjectId).lean()) as any;
    if (!reseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller profile not found");
    }

    // 1. Inventory Aggregations: Active Count, Total Views, Estimated Inventory Value
    const [inventoryStats] = await PairsModel.aggregate([
      {
        $match: {
          resellerId: resellerObjectId,
          isSold: false,
          productStatus: { $ne: "inactive" },
        },
      },
      {
        $project: {
          pairViewCount: { $ifNull: ["$pairViewCount", 0] },
          askingPrice: { $ifNull: ["$askingPrice", 0] },
          totalStock: {
            $sum: "$variant.stock",
          },
        },
      },
      {
        $group: {
          _id: null,
          activeListings: { $sum: 1 },
          totalViews: { $sum: "$pairViewCount" },
          totalInventoryValue: {
            $sum: { $multiply: ["$askingPrice", { $max: ["$totalStock", 1] }] },
          },
        },
      },
    ]);

    // 2. Store Requests & Deal Flow Aggregations
    const [requestStats] = await PairRequestModel.aggregate([
      {
        $match: {
          resellerId: resellerObjectId,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalOfferedValue: { $sum: "$askingPrice" },
        },
      },
    ]);

    const activeListingsCount = inventoryStats?.activeListings || 0;
    const totalViews = inventoryStats?.totalViews || 0;
    const totalInventoryValue = Math.round((inventoryStats?.totalInventoryValue || 0) * 100) / 100;

    // Inbound request counts by status
    const pendingRequests = await PairRequestModel.countDocuments({
      resellerId: resellerObjectId,
      status: "Pending",
    });
    const acceptedDeals = await PairRequestModel.countDocuments({
      resellerId: resellerObjectId,
      status: "Accepted",
    });
    const completedDeals = await PairRequestModel.countDocuments({
      resellerId: resellerObjectId,
      status: "Completed",
    });

    return {
      activeListing: activeListingsCount,
      totalViews,
      totalInventoryValue,
      storeRequests: {
        pending: pendingRequests,
        accepted: acceptedDeals,
        completed: completedDeals,
        total: pendingRequests + acceptedDeals + completedDeals,
      },
      reputation: {
        trustScore: reseller.trustScore ?? 98,
        responseRatePercent: reseller.responseRatePercent ?? 96,
        completedDealsCount: completedDeals || reseller.completedDealsCount || 0,
        volumeSoldAmount: reseller.volumeSoldAmount ?? 0,
        rating: reseller.rating ?? 4.8,
        badge: reseller.badge || "Trusted Seller",
      },
      visibilityControls: reseller.visibilityControls || {
        isProfilePublic: true,
        showListings: true,
        showPrices: true,
        approximateLocation: false,
        onlineStatus: true,
      },
    };
  }

  /**
   * Reseller Profile Header & High-Level Statistics
   */
  static async getProfileStatData(user: IJwtPayload) {
    const resellerObjectId = new Types.ObjectId(user.profileId);
    const reseller = (await ResellerModel.findById(resellerObjectId).lean()) as any;
    if (!reseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller profile not found");
    }

    const totalListings = await PairsModel.countDocuments({ resellerId: resellerObjectId });
    const soldListings = await PairsModel.countDocuments({
      resellerId: resellerObjectId,
      isSold: true,
    });

    return {
      name: reseller.name,
      storeName: reseller.storeName || reseller.name,
      image: reseller.image || reseller.profileImage || "",
      coverImage: reseller.coverImage || "",
      badge: reseller.badge || "Trusted Seller",
      trustScore: reseller.trustScore ?? 98,
      rating: reseller.rating ?? 4.8,
      completedDealsCount: reseller.completedDealsCount ?? 0,
      totalListings,
      soldListings,
      visibilityControls: reseller.visibilityControls,
    };
  }
}
