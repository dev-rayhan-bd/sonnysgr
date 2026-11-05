import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import RetailerModel from "../../Retailer/Retailer.model";
import BuyerModel from "../Buyer.model";

/**
 * Sub-Service dedicated to GoSNKR's Core USP: Hyper-Local Size-Match & Map Discovery
 * Matches customer shoe sizes with real-time nearby store inventory variants (Zero .populate)
 */
export class BuyerSizeMatchDiscoverySubService {
  /**
   * Get Live Size-Matched Sneakers from Nearby Stores (Core USP - Module 3)
   */
  static async getLiveSizeMatchFeed(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;
    const buyerObjectId = new mongoose.Types.ObjectId(profileId);

    // 1. Resolve Location (from query or buyer profile)
    let lng = Number(query.longitude || query.lng);
    let lat = Number(query.latitude || query.lat);

    const buyer = (await BuyerModel.findById(buyerObjectId).lean()) as any;
    if ((!lng || !lat) && buyer?.location?.coordinates && buyer.location.coordinates[0] !== 0) {
      lng = buyer.location.coordinates[0];
      lat = buyer.location.coordinates[1];
    }

    if (!lng || !lat) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Latitude and longitude are required for hyper-local size discovery."
      );
    }

    // 2. Resolve Target Shoe Size
    const targetSize = String(query.size || buyer?.shoeSize || "");
    if (!targetSize) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Shoe size is required. Please set your size or pass it in query."
      );
    }

    const radiusMiles = Number(query.radiusMiles || query.radius || 15);
    const maxMeters = radiusMiles * 1609.34;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;
    const skip = (page - 1) * limit;

    // Filters for product join
    const productMatch: any = {
      availability: { $in: ["Active", "Coming Soon"] },
      "variant.size": targetSize,
      "variant.stock": { $gt: 0 },
    };

    if (query.brand) {
      productMatch.brand = { $regex: String(query.brand), $options: "i" };
    }
    if (query.minPrice || query.maxPrice) {
      productMatch.price = {};
      if (query.minPrice) productMatch.price.$gte = Number(query.minPrice);
      if (query.maxPrice) productMatch.price.$lte = Number(query.maxPrice);
    }

    // 3. High-Performance $geoNear Aggregation Pipeline
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
          query: { isApproved: true },
        },
      },
      // Join store's active products carrying this size in stock
      {
        $lookup: {
          from: "products",
          let: { storeId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$retailerId", "$$storeId"] },
                ...productMatch,
              },
            },
          ],
          as: "matchedProducts",
        },
      },
      { $unwind: "$matchedProducts" },
      {
        $project: {
          _id: "$matchedProducts._id",
          name: "$matchedProducts.name",
          brand: "$matchedProducts.brand",
          price: "$matchedProducts.price",
          images: "$matchedProducts.images",
          category: "$matchedProducts.category",
          styleCode: "$matchedProducts.styleCode",
          colorway: "$matchedProducts.sneakerAttributes.colorway",
          targetSize,
          stockVariants: {
            $filter: {
              input: "$matchedProducts.variant",
              as: "v",
              cond: {
                $and: [
                  { $eq: ["$$v.size", targetSize] },
                  { $gt: ["$$v.stock", 0] },
                ],
              },
            },
          },
          store: {
            _id: "$_id",
            name: "$name",
            image: "$image",
            phone: "$phone",
            address: "$address",
            averageRating: "$averageRating",
            distanceInMiles: {
              $round: [{ $divide: ["$distance", 1609.34] }, 1],
            },
          },
        },
      },
      { $sort: { "store.distanceInMiles": 1, price: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "total" }],
        },
      },
    ];

    const result = await RetailerModel.aggregate(pipeline);
    const facetData = result[0] || {};
    const data = facetData.data || [];
    const total = facetData.totalCount?.[0]?.total || 0;
    const totalPage = Math.ceil(total / limit);

    return {
      targetSize,
      radiusMiles,
      meta: { page, limit, total, totalPage },
      data,
    };
  }

  /**
   * Get Interactive Map Pins of Nearby Stores carrying customer's shoe size (Module 5)
   */
  static async getSizeMatchMapPins(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;
    const buyerObjectId = new mongoose.Types.ObjectId(profileId);

    let lng = Number(query.longitude || query.lng);
    let lat = Number(query.latitude || query.lat);

    const buyer = (await BuyerModel.findById(buyerObjectId).lean()) as any;
    if ((!lng || !lat) && buyer?.location?.coordinates && buyer.location.coordinates[0] !== 0) {
      lng = buyer.location.coordinates[0];
      lat = buyer.location.coordinates[1];
    }

    if (!lng || !lat) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coordinates are required for map locator pins."
      );
    }

    const targetSize = String(query.size || buyer?.shoeSize || "");
    const radiusMiles = Number(query.radiusMiles || query.radius || 25);
    const maxMeters = radiusMiles * 1609.34;

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
          query: { isApproved: true },
        },
      },
      {
        $lookup: {
          from: "products",
          let: { storeId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$retailerId", "$$storeId"] },
                availability: "Active",
                ...(targetSize
                  ? { "variant.size": targetSize, "variant.stock": { $gt: 0 } }
                  : {}),
              },
            },
          ],
          as: "inStockProducts",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          phone: 1,
          address: 1,
          location: 1,
          averageRating: 1,
          distanceInMiles: {
            $round: [{ $divide: ["$distance", 1609.34] }, 1],
          },
          inStockPairsCount: { $size: "$inStockProducts" },
          operationHours: 1,
        },
      },
      { $match: { inStockPairsCount: { $gt: 0 } } },
      { $sort: { distanceInMiles: 1 } },
    ];

    const pins = await RetailerModel.aggregate(pipeline);
    return {
      targetSize: targetSize || "All Sizes",
      radiusMiles,
      pins,
    };
  }
}

