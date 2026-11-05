import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import LockerModel from "../Locker.model";
import QueryBuilder from "../../../builder/QueryBuilder";

/**
 * Sub-Service dedicated to Locker Read Queries, Public Community Browsing & Hyper-Local Feeds
 */
export class LockerQuerySubService {
  /**
   * Get authenticated user's personal sneaker locker with QueryBuilder
   */
  static async getMyLocker(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const { profileId } = userDetails;

    const baseFilter: Record<string, any> = {
      buyerId: new mongoose.Types.ObjectId(profileId),
    };

    const queryBuilder = new QueryBuilder(LockerModel.find(baseFilter), query)
      .search(["name", "brand", "styleCode", "colorway"])
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await queryBuilder.modelQuery.lean();
    const meta = await queryBuilder.countTotal();

    return { meta, data };
  }

  /**
   * Get single locker sneaker details with native $lookup join (Zero .populate())
   */
  static async getSingleLockerItem(lockerItemId: string) {
    if (!mongoose.Types.ObjectId.isValid(lockerItemId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid locker item ID.");
    }

    const objectId = new mongoose.Types.ObjectId(lockerItemId);

    // Atomically increment views count
    await LockerModel.findByIdAndUpdate(objectId, { $inc: { viewsCount: 1 } });

    const pipeline: any[] = [
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: "buyers",
          localField: "buyerId",
          foreignField: "_id",
          as: "collector",
        },
      },
      { $unwind: { path: "$collector", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: 1,
          brand: 1,
          styleCode: 1,
          colorway: 1,
          size: 1,
          condition: 1,
          boxCondition: 1,
          accessories: 1,
          askingPrice: 1,
          images: 1,
          description: 1,
          isPublic: 1,
          isAvailableForTradeIn: 1,
          status: 1,
          location: 1,
          city: 1,
          viewsCount: 1,
          createdAt: 1,
          collector: {
            _id: "$collector._id",
            name: "$collector.name",
            image: "$collector.image",
            phone: "$collector.phone",
            membershipStatus: "$collector.membershipStatus",
            myReviews: "$collector.myReviews",
          },
        },
      },
    ];

    const results = await LockerModel.aggregate(pipeline);
    if (!results || results.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, "Locker sneaker not found.");
    }

    return results[0];
  }

  /**
   * Hyper-Local Sneaker Locker Discovery for Retailers & Public
   * Uses native $geoNear to discover sneakers available for trade-in / buyback within radius
   */
  static async getNearbyCommunityLockers(query: Record<string, unknown>) {
    const lat = Number(query.latitude || query.lat);
    const lng = Number(query.longitude || query.lng);

    if (!lat || !lng) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Latitude and longitude coordinates are required for nearby locker discovery."
      );
    }

    const radiusMiles = Number(query.radiusMiles || query.radius || 15);
    const maxMeters = radiusMiles * 1609.34;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const brandFilter = query.brand ? { brand: { $regex: String(query.brand), $options: "i" } } : {};
    const sizeFilter = query.size ? { size: String(query.size) } : {};

    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distance",
          maxDistance: maxMeters,
          spherical: true,
          query: {
            isPublic: true,
            isAvailableForTradeIn: true,
            status: { $in: ["IN_LOCKER", "OFFER_PENDING"] },
            ...brandFilter,
            ...sizeFilter,
          },
        },
      },
      {
        $lookup: {
          from: "buyers",
          localField: "buyerId",
          foreignField: "_id",
          as: "collector",
        },
      },
      { $unwind: { path: "$collector", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: 1,
          brand: 1,
          styleCode: 1,
          colorway: 1,
          size: 1,
          condition: 1,
          boxCondition: 1,
          askingPrice: 1,
          images: 1,
          distanceInMiles: {
            $round: [{ $divide: ["$distance", 1609.34] }, 1],
          },
          status: 1,
          createdAt: 1,
          collectorName: { $ifNull: ["$collector.name", "Sneakerhead"] },
          collectorImage: { $ifNull: ["$collector.image", ""] },
        },
      },
      { $sort: { distance: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "total" }],
        },
      },
    ];

    const result = await LockerModel.aggregate(pipeline);
    const facetData = result[0] || {};
    const data = facetData.data || [];
    const total = facetData.totalCount?.[0]?.total || 0;
    const totalPage = Math.ceil(total / limit);

    return {
      meta: { page, limit, total, totalPage },
      data,
    };
  }
}

