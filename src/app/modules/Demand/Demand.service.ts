import mongoose, { Types } from "mongoose";
import ApiError from "../../../error/ApiError";
import { IDemandEvent, TDemandEventType, DEMAND_EVENT_WEIGHTS } from "./Demand.interface";
import DemandEventModel from "./Demand.model";
import BuyerModel from "../Buyer/Buyer.model";
import RetailerModel from "../Retailer/Retailer.model";
import { ProductModel } from "../Product/Product.model";

/**
 * Log demand event asynchronously so it doesn't block the main flow.
 */
const logDemandEventAsync = (payload: {
  buyerId: string;
  productId: string;
  retailerId?: string;
  size?: string;
  eventType: TDemandEventType;
  coordinates?: number[];
}) => {
  setImmediate(async () => {
    try {
      let finalCoordinates = payload.coordinates;
      if (!finalCoordinates) {
        const buyer = (await BuyerModel.findById(payload.buyerId).lean()) as any;
        if (buyer && buyer.location && buyer.location.coordinates) {
          finalCoordinates = buyer.location.coordinates;
        }
      }

      if (!finalCoordinates || finalCoordinates.length !== 2) {
        finalCoordinates = [0, 0];
      }

      const weight = DEMAND_EVENT_WEIGHTS[payload.eventType] || 1;

      await DemandEventModel.create({
        buyerId: new Types.ObjectId(payload.buyerId),
        productId: new Types.ObjectId(payload.productId),
        retailerId: payload.retailerId ? new Types.ObjectId(payload.retailerId) : null,
        size: payload.size || null,
        eventType: payload.eventType,
        weight,
        location: {
          type: "Point",
          coordinates: finalCoordinates,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error logging DemandEvent asynchronously:", error);
    }
  });
};

/**
 * Retrieve local demand for a retailer.
 */
const getLocalDemandService = async (
  retailerId: string,
  query: { radius: number; startDate?: string; endDate?: string }
) => {
  const retailer = (await RetailerModel.findById(retailerId).lean()) as any;
  if (!retailer || !retailer.location || !retailer.location.coordinates) {
    throw new ApiError(404, "Retailer profile or location not found");
  }

  const [lng, lat] = retailer.location.coordinates;
// console.log("Retailer coordinates:", lng, lat);
  const maxDistanceInMeters = query.radius * 1609.34; // Miles to Meters

  const dateFilter: any = {};
  if (query.startDate || query.endDate) {
    dateFilter.timestamp = {};
    if (query.startDate) dateFilter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) dateFilter.timestamp.$lte = new Date(query.endDate);
  }

  const results = await DemandEventModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: maxDistanceInMeters,
        spherical: true,
        query: dateFilter,
      },
    },
    // Recency scoring: last 7 days = 1.0, last 14 days = 0.7, last 30 days = 0.4, older = 0.1
    {
      $addFields: {
        decayFactor: {
          $cond: [
            { $gte: ["$timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
            1.0,
            {
              $cond: [
                { $gte: ["$timestamp", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)] },
                0.7,
                {
                  $cond: [
                    { $gte: ["$timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                    0.4,
                    0.1,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        eventScore: { $multiply: ["$weight", "$decayFactor"] },
      },
    },
    // Group by product
    {
      $group: {
        _id: "$productId",
        demandScore: { $sum: "$eventScore" },
        uniqueBuyers: { $addToSet: "$buyerId" },
        eventCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        uniqueBuyerCount: { $size: "$uniqueBuyers" },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        name: "$product.name",
        brand: "$product.brand",
        price: "$product.price",
        images: "$product.images",
        demandScore: 1,
        uniqueBuyerCount: 1,
        eventCount: 1,
      },
    },
    { $sort: { demandScore: -1 } },
  ]);

  return results;
};

/**
 * Retrieve size demand for a specific product.
 */
const getSizeDemandService = async (
  retailerId: string,
  productId: string,
  query: { radius: number; startDate?: string; endDate?: string }
) => {
  const retailer = (await RetailerModel.findById(retailerId).lean()) as any;
  if (!retailer || !retailer.location || !retailer.location.coordinates) {
    throw new ApiError(404, "Retailer profile or location not found");
  }

  const [lng, lat] = retailer.location.coordinates;
  const maxDistanceInMeters = query.radius * 1609.34;

  const dateFilter: any = {
    productId: new Types.ObjectId(productId),
  };
  if (query.startDate || query.endDate) {
    dateFilter.timestamp = {};
    if (query.startDate) dateFilter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) dateFilter.timestamp.$lte = new Date(query.endDate);
  }

  const results = await DemandEventModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: maxDistanceInMeters,
        spherical: true,
        query: dateFilter,
      },
    },
    {
      $addFields: {
        decayFactor: {
          $cond: [
            { $gte: ["$timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
            1.0,
            {
              $cond: [
                { $gte: ["$timestamp", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)] },
                0.7,
                {
                  $cond: [
                    { $gte: ["$timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                    0.4,
                    0.1,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        eventScore: { $multiply: ["$weight", "$decayFactor"] },
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$size", "Unspecified"] },
        demandScore: { $sum: "$eventScore" },
        uniqueBuyers: { $addToSet: "$buyerId" },
        eventCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        uniqueBuyerCount: { $size: "$uniqueBuyers" },
      },
    },
    {
      $project: {
        _id: 0,
        size: "$_id",
        demandScore: 1,
        uniqueBuyerCount: 1,
        eventCount: 1,
      },
    },
    { $sort: { demandScore: -1 } },
  ]);

  return results;
};

/**
 * Retrieve demand gaps where local demand is high but stock is low/out-of-stock.
 */
const getDemandGapsService = async (
  retailerId: string,
  query: { radius: number; startDate?: string; endDate?: string }
) => {
  const retailer = (await RetailerModel.findById(retailerId).lean()) as any;
  if (!retailer || !retailer.location || !retailer.location.coordinates) {
    throw new ApiError(404, "Retailer profile or location not found");
  }

  const [lng, lat] = retailer.location.coordinates;
  const maxDistanceInMeters = query.radius * 1609.34;

  const dateFilter: any = {};
  if (query.startDate || query.endDate) {
    dateFilter.timestamp = {};
    if (query.startDate) dateFilter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) dateFilter.timestamp.$lte = new Date(query.endDate);
  }

  const demandResults = await DemandEventModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: maxDistanceInMeters,
        spherical: true,
        query: dateFilter,
      },
    },
    {
      $addFields: {
        decayFactor: {
          $cond: [
            { $gte: ["$timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
            1.0,
            {
              $cond: [
                { $gte: ["$timestamp", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)] },
                0.7,
                {
                  $cond: [
                    { $gte: ["$timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                    0.4,
                    0.1,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        eventScore: { $multiply: ["$weight", "$decayFactor"] },
      },
    },
    {
      $group: {
        _id: {
          productId: "$productId",
          size: "$size",
        },
        demandScore: { $sum: "$eventScore" },
        uniqueBuyers: { $addToSet: "$buyerId" },
        eventCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        uniqueBuyerCount: { $size: "$uniqueBuyers" },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $addFields: {
        matchingVariant: {
          $filter: {
            input: "$product.variant",
            as: "v",
            cond: { $eq: ["$$v.size", "$_id.size"] },
          },
        },
      },
    },
    {
      $addFields: {
        stock: {
          $cond: [
            { $gt: [{ $size: "$matchingVariant" }, 0] },
            { $arrayElemAt: ["$matchingVariant.stock", 0] },
            0,
          ],
        },
        isRetailerProduct: {
          $eq: ["$product.retailerId", new mongoose.Types.ObjectId(retailerId)],
        },
      },
    },
    {
      $addFields: {
        // Gap score: demand score divided by stock (normalized to prevent division by 0)
        gapScore: {
          $divide: ["$demandScore", { $add: ["$stock", 1] }],
        },
      },
    },
    {
      // Identify a gap where either stock is low (< 5), product is out of stock, or not listed by the retailer at all
      $match: {
        $or: [{ stock: { $lt: 5 } }, { isRetailerProduct: false }],
      },
    },
    {
      $project: {
        _id: 0,
        productId: "$_id.productId",
        name: "$product.name",
        brand: "$product.brand",
        price: "$product.price",
        size: { $ifNull: ["$_id.size", "Unspecified"] },
        stock: 1,
        demandScore: 1,
        uniqueBuyerCount: 1,
        gapScore: 1,
        isRetailerProduct: 1,
      },
    },
    { $sort: { gapScore: -1 } },
  ]);

  return demandResults;
};

export const DemandServices = {
  logDemandEventAsync,
  getLocalDemandService,
  getSizeDemandService,
  getDemandGapsService,
};
export default DemandServices;
