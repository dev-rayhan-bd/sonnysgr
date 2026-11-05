import mongoose, { Types } from "mongoose";
import LockerModel from "../Locker.model";
import BuyerModel from "../../Buyer/Buyer.model";
import { FollowUserModel } from "../../Engagement/Engagement.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { getIO } from "../../../utils/socket";

export class LockerCommunitySubService {
  /**
   * Compute comprehensive Collection Statistics (Pairs count, Total Estimated Value, Condition Breakdown)
   */
  static async computeCollectionStats(buyerId: Types.ObjectId) {
    const [stats] = await LockerModel.aggregate([
      {
        $match: {
          buyerId,
          status: { $ne: "SOLD_TO_STORE" },
        },
      },
      {
        $group: {
          _id: null,
          totalPairs: { $sum: 1 },
          estimatedTotalValue: { $sum: "$askingPrice" },
          tradeInEligibleCount: {
            $sum: { $cond: [{ $eq: ["$isAvailableForTradeIn", true] }, 1, 0] },
          },
          publicPairsCount: {
            $sum: { $cond: [{ $eq: ["$isPublic", true] }, 1, 0] },
          },
          conditions: { $push: "$condition" },
          brands: { $push: "$brand" },
        },
      },
    ]);

    if (!stats) {
      return {
        totalPairs: 0,
        estimatedTotalValue: 0,
        tradeInEligibleCount: 0,
        publicPairsCount: 0,
        conditionBreakdown: {},
        topBrands: [],
      };
    }

    // Calculate condition breakdown
    const conditionBreakdown: Record<string, number> = {};
    (stats.conditions || []).forEach((cond: string) => {
      conditionBreakdown[cond] = (conditionBreakdown[cond] || 0) + 1;
    });

    // Top brands
    const brandCounts: Record<string, number> = {};
    (stats.brands || []).forEach((b: string) => {
      brandCounts[b] = (brandCounts[b] || 0) + 1;
    });
    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([brand]) => brand);

    return {
      totalPairs: stats.totalPairs,
      estimatedTotalValue: Math.round(stats.estimatedTotalValue * 100) / 100,
      tradeInEligibleCount: stats.tradeInEligibleCount,
      publicPairsCount: stats.publicPairsCount,
      conditionBreakdown,
      topBrands,
    };
  }

  /**
   * Browse community lockers feed (Native Aggregation, No .populate())
   */
  static async getCommunityLockers(query: {
    page?: number;
    limit?: number;
    searchTerm?: string;
    city?: string;
    brand?: string;
    size?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const matchLocker: any = {
      isPublic: true,
      status: { $in: ["IN_LOCKER", "OFFER_PENDING"] },
    };

    if (query.brand) {
      matchLocker.brand = { $regex: query.brand, $options: "i" };
    }
    if (query.size) {
      matchLocker.size = query.size;
    }

    const pipeline: any[] = [
      { $match: matchLocker },
      // Group by collector (buyerId)
      {
        $group: {
          _id: "$buyerId",
          totalPairs: { $sum: 1 },
          estimatedTotalValue: { $sum: "$askingPrice" },
          showcaseImages: { $push: { $arrayElemAt: ["$images", 0] } },
          brands: { $addToSet: "$brand" },
        },
      },
      // Join Buyer profile
      {
        $lookup: {
          from: "buyers",
          localField: "_id",
          foreignField: "_id",
          as: "collector",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
                address: 1,
                membershipStatus: 1,
                privacy: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$collector" },
      // Filter out collectors who set entire locker collection to private
      {
        $match: {
          "collector.privacy.isLockerCollectionPublic": { $ne: false },
        },
      },
    ];

    if (query.searchTerm) {
      pipeline.push({
        $match: {
          $or: [
            { "collector.name": { $regex: query.searchTerm, $options: "i" } },
            { "collector.address": { $regex: query.searchTerm, $options: "i" } },
          ],
        },
      });
    }

    if (query.city) {
      pipeline.push({
        $match: {
          "collector.address": { $regex: query.city, $options: "i" },
        },
      });
    }

    pipeline.push(
      {
        $project: {
          collectorId: "$_id",
          collectorName: "$collector.name",
          collectorImage: "$collector.image",
          collectorLocation: "$collector.address",
          membershipStatus: "$collector.membershipStatus",
          totalPairs: 1,
          estimatedTotalValue: { $round: ["$estimatedTotalValue", 2] },
          showcaseImages: { $slice: ["$showcaseImages", 4] },
          topBrands: { $slice: ["$brands", 3] },
        },
      },
      { $sort: { totalPairs: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      }
    );

    const [result] = await LockerModel.aggregate(pipeline);
    const data = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;

    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data,
    };
  }

  /**
   * View a specific collector's public locker showcase & collection stats
   */
  static async getCollectorPublicLocker(targetBuyerId: string, currentUserId?: string) {
    const buyerObjectId = new Types.ObjectId(targetBuyerId);

    const collector = (await BuyerModel.findById(buyerObjectId).lean()) as any;
    if (!collector) {
      throw new AppError(StatusCodes.NOT_FOUND, "Collector profile not found");
    }

    // Enforce privacy rule
    if (collector.privacy?.isLockerCollectionPublic === false && String(currentUserId) !== targetBuyerId) {
      throw new AppError(StatusCodes.FORBIDDEN, "This collector's locker is private");
    }

    // Fetch public sneakers in locker
    const items = await LockerModel.find({
      buyerId: buyerObjectId,
      isPublic: true,
      status: { $ne: "SOLD_TO_STORE" },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Compute stats
    const stats = await this.computeCollectionStats(buyerObjectId);

    // Follow status
    let isFollowing = false;
    if (currentUserId && currentUserId !== targetBuyerId) {
      const follow = await FollowUserModel.findOne({
        senderId: new Types.ObjectId(currentUserId),
        receiverId: buyerObjectId,
      });
      isFollowing = !!follow;
    }

    const followersCount = await FollowUserModel.countDocuments({ receiverId: buyerObjectId });
    const followingCount = await FollowUserModel.countDocuments({ senderId: buyerObjectId });

    return {
      collector: {
        _id: collector._id,
        name: collector.name,
        image: collector.image,
        bio: collector.bio || "",
        address: collector.address || "",
        membershipStatus: collector.membershipStatus,
        followersCount,
        followingCount,
        isFollowing,
      },
      stats,
      items,
    };
  }

  /**
   * Toggle follow / unfollow on a community sneaker collector
   */
  static async toggleFollowCollector(currentUser: IJwtPayload, targetBuyerId: string) {
    const senderObjectId = new Types.ObjectId(currentUser.profileId);
    const receiverObjectId = new Types.ObjectId(targetBuyerId);

    if (senderObjectId.equals(receiverObjectId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "You cannot follow your own collector profile");
    }

    const targetBuyer = await BuyerModel.findById(receiverObjectId);
    if (!targetBuyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Collector not found");
    }

    const existingFollow = await FollowUserModel.findOne({
      senderId: senderObjectId,
      receiverId: receiverObjectId,
    });

    if (existingFollow) {
      await FollowUserModel.deleteOne({ _id: existingFollow._id });
      return { isFollowing: false, message: "Unfollowed collector successfully" };
    } else {
      await FollowUserModel.create({
        senderId: senderObjectId,
        receiverId: receiverObjectId,
      });

      // Emit socket notification
      try {
        const io = getIO();
        io.to(targetBuyerId).emit("new_collector_follower", {
          followerId: currentUser.profileId,
          message: `${currentUser.email || "A sneakerhead"} started following your locker collection`,
        });
      } catch (e) {
        // Non-blocking socket error
      }

      return { isFollowing: true, message: "Followed collector successfully" };
    }
  }

  /**
   * Get all collectors followed by authenticated user
   */
  static async getFollowedCollectors(currentUser: IJwtPayload) {
    const userObjectId = new Types.ObjectId(currentUser.profileId);

    const followed = await FollowUserModel.aggregate([
      { $match: { senderId: userObjectId } },
      {
        $lookup: {
          from: "buyers",
          localField: "receiverId",
          foreignField: "_id",
          as: "collector",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
                address: 1,
                membershipStatus: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$collector" },
      {
        $lookup: {
          from: "lockers",
          let: { bId: "$receiverId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$buyerId", "$$bId"] },
                    { $eq: ["$isPublic", true] },
                    { $ne: ["$status", "SOLD_TO_STORE"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 3 },
            { $project: { name: 1, brand: 1, askingPrice: 1, images: 1 } },
          ],
          as: "recentGrails",
        },
      },
      {
        $project: {
          _id: "$collector._id",
          name: "$collector.name",
          image: "$collector.image",
          address: "$collector.address",
          membershipStatus: "$collector.membershipStatus",
          recentGrails: 1,
          followedAt: "$createdAt",
        },
      },
    ]);

    return followed;
  }
}
