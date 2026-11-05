import mongoose, { Types } from "mongoose";
import { PairsModel } from "../Pairs.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";

export class PairsQuerySubService {
  /**
   * Reseller fetches their own listed pairs with pagination and filtering
   */
  static async getMyListedPairs(user: IJwtPayload, query: any) {
    const resellerObjectId = new Types.ObjectId(user.profileId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter: any = { resellerId: resellerObjectId };

    if (query.brand) {
      filter.brand = { $regex: query.brand, $options: "i" };
    }
    if (query.status) {
      filter.productStatus = query.status;
    }
    if (query.isSold !== undefined) {
      filter.isSold = query.isSold === "true";
    }
    if (query.searchTerm) {
      filter.$or = [
        { name: { $regex: query.searchTerm, $options: "i" } },
        { brand: { $regex: query.searchTerm, $options: "i" } },
        { styleCode: { $regex: query.searchTerm, $options: "i" } },
      ];
    }

    const total = await PairsModel.countDocuments(filter);
    const pairs = await PairsModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      pairs,
    };
  }

  /**
   * Get single pair details with atomic view count increment (Zero .populate())
   */
  static async getSinglePairDetails(pairId: string) {
    const pairObjectId = new Types.ObjectId(pairId);

    // Atomically increment view count
    await PairsModel.findByIdAndUpdate(pairObjectId, {
      $inc: { pairViewCount: 1 },
    });

    const [pair] = await PairsModel.aggregate([
      { $match: { _id: pairObjectId } },
      {
        $lookup: {
          from: "resellers",
          localField: "resellerId",
          foreignField: "_id",
          as: "reseller",
          pipeline: [
            {
              $project: {
                name: 1,
                storeName: 1,
                image: 1,
                profileImage: 1,
                badge: 1,
                trustScore: 1,
                rating: 1,
                completedDealsCount: 1,
                visibilityControls: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$reseller",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    if (!pair) {
      throw new AppError(StatusCodes.NOT_FOUND, "Pair listing not found");
    }

    return pair;
  }

  /**
   * Stores browse active B2B reseller listings (Native Aggregation with $lookup, $match, $facet)
   */
  static async browseB2BPairs(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const matchConditions: any = {
      isSold: false,
      productStatus: { $ne: "inactive" },
      isVisibleToStore: true,
    };

    if (query.brand) {
      matchConditions.brand = { $regex: query.brand, $options: "i" };
    }
    if (query.condition) {
      matchConditions.condition = query.condition;
    }
    if (query.size) {
      matchConditions["variant.size"] = query.size;
    }
    if (query.minPrice || query.maxPrice) {
      matchConditions.askingPrice = {};
      if (query.minPrice) matchConditions.askingPrice.$gte = Number(query.minPrice);
      if (query.maxPrice) matchConditions.askingPrice.$lte = Number(query.maxPrice);
    }
    if (query.searchTerm) {
      matchConditions.$or = [
        { name: { $regex: query.searchTerm, $options: "i" } },
        { brand: { $regex: query.searchTerm, $options: "i" } },
        { styleCode: { $regex: query.searchTerm, $options: "i" } },
      ];
    }

    const pipeline: any[] = [
      { $match: matchConditions },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "resellers",
          localField: "resellerId",
          foreignField: "_id",
          as: "reseller",
          pipeline: [
            {
              $project: {
                name: 1,
                storeName: 1,
                image: 1,
                badge: 1,
                trustScore: 1,
                rating: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$reseller",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [aggregationResult] = await PairsModel.aggregate(pipeline);
    const data = aggregationResult?.data || [];
    const total = aggregationResult?.totalCount?.[0]?.count || 0;

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
}
