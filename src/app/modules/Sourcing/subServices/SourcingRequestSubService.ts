import mongoose, { Types } from "mongoose";
import { SourcingRequestModel } from "../sourcingRequest/SourcingRequest.model";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import DemandEventModel from "../../Demand/Demand.model";
import { ChatFacadeService } from "../../Chat/ChatFacadeService";
import { getIO } from "../../../utils/socket";

export class SourcingRequestSubService {
  /**
   * Buyer posts an explicit Sneaker Sourcing / Wanted Pair Request
   */
  static async createRequest(
    user: IJwtPayload,
    payload: {
      brand: string;
      modelName: string;
      colorway?: string;
      size: string;
      maxBudget: number;
      notes?: string;
      images?: string[];
      coordinates?: number[]; // [lng, lat]
      durationDays?: number;
    }
  ) {
    const buyerObjectId = new Types.ObjectId(user.profileId);
    let coords = payload.coordinates;

    if (!coords || coords.length !== 2) {
      const buyer = (await BuyerModel.findById(buyerObjectId).lean()) as any;
      if (buyer?.location?.coordinates?.length === 2) {
        coords = buyer.location.coordinates;
      } else {
        coords = [0, 0];
      }
    }

    const durationDays = payload.durationDays || 7;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const request = await SourcingRequestModel.create({
      buyerId: buyerObjectId,
      brand: payload.brand,
      modelName: payload.modelName,
      colorway: payload.colorway || "",
      size: payload.size,
      maxBudget: payload.maxBudget,
      notes: payload.notes || "",
      images: payload.images || [],
      location: {
        type: "Point",
        coordinates: coords,
      },
      status: "OPEN",
      expiresAt,
    });

    // Fire asynchronous demand tracking event
    setImmediate(async () => {
      try {
        await DemandEventModel.create({
          buyerId: buyerObjectId,
          size: payload.size,
          eventType: "explicit_request",
          weight: 6,
          location: {
            type: "Point",
            coordinates: coords,
          },
          timestamp: new Date(),
        });
      } catch (err) {
        console.error("Demand event logging failed:", err);
      }
    });

    return request;
  }

  /**
   * Buyer retrieves their own submitted sourcing requests
   */
  static async getBuyerRequests(user: IJwtPayload) {
    const buyerObjectId = new Types.ObjectId(user.profileId);
    return SourcingRequestModel.find({ buyerId: buyerObjectId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Retailers view the real-time Community Sourcing / Wanted Sneakers Feed (Native Geo-Aggregation)
   */
  static async getCommunityDemandFeed(
    user: IJwtPayload,
    query: { radius?: number; brand?: string; size?: string; page?: number; limit?: number }
  ) {
    const retailerObjectId = new Types.ObjectId(user.profileId);
    const retailer = (await RetailerModel.findById(retailerObjectId).lean()) as any;

    if (!retailer || !retailer.location?.coordinates) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer profile or location coordinates not found");
    }

    const [lng, lat] = retailer.location.coordinates;
    const radiusMiles = Number(query.radius) || 25;
    const maxDistanceMeters = radiusMiles * 1609.34;

    const matchConditions: any = {
      status: { $in: ["OPEN", "RESPONDED"] },
      expiresAt: { $gt: new Date() },
    };

    if (query.brand) {
      matchConditions.brand = { $regex: query.brand, $options: "i" };
    }
    if (query.size) {
      matchConditions.size = query.size;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: matchConditions,
        },
      },
      {
        $addFields: {
          distanceMiles: {
            $round: [{ $divide: ["$distanceMeters", 1609.34] }, 1],
          },
        },
      },
      {
        $lookup: {
          from: "buyers",
          localField: "buyerId",
          foreignField: "_id",
          as: "buyerProfile",
          pipeline: [{ $project: { name: 1, avatar: 1, vipTier: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$buyerProfile",
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

    const [aggregationResult] = await SourcingRequestModel.aggregate(pipeline);
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

  /**
   * Retailer responds to a buyer's sourcing request with an offer / in-stock match
   */
  static async respondToRequest(
    user: IJwtPayload,
    requestId: string,
    payload: {
      quotedPrice: number;
      inStockNow: boolean;
      notes?: string;
      matchedProductId?: string;
    }
  ) {
    const retailerObjectId = new Types.ObjectId(user.profileId);
    const retailer = (await RetailerModel.findById(retailerObjectId).lean()) as any;

    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer store profile not found");
    }

    const request = await SourcingRequestModel.findById(requestId);
    if (!request) {
      throw new AppError(StatusCodes.NOT_FOUND, "Sourcing request not found");
    }

    if (request.status === "FULFILLED" || request.status === "CANCELLED") {
      throw new AppError(StatusCodes.BAD_REQUEST, `Cannot respond to ${request.status} request`);
    }

    const responseItem = {
      retailerId: retailerObjectId,
      storeName: retailer.storeName || retailer.name,
      storeLogo: retailer.logo || "",
      quotedPrice: payload.quotedPrice,
      inStockNow: payload.inStockNow,
      notes: payload.notes || "",
      matchedProductId: payload.matchedProductId
        ? new Types.ObjectId(payload.matchedProductId)
        : undefined,
      respondedAt: new Date(),
    };

    request.responses.push(responseItem as any);
    request.status = "RESPONDED";
    await request.save();

    // Auto-initiate a direct chat thread between Retailer and Buyer
    try {
      const conversation = await ChatFacadeService.initiateOrGetConversation(user, {
        counterpartyId: request.buyerId.toString(),
        counterpartyRole: "Buyer",
        contextType: "STORE_INQUIRY",
        contextId: request._id.toString(),
      });

      // Send initial inquiry card message
      await ChatFacadeService.sendMessage(user, {
        conversationId: conversation._id.toString(),
        text: `Hello! We have matched your wanted request for '${request.brand} ${request.modelName}' (Size: ${request.size}). Quoted Price: $${payload.quotedPrice}. ${payload.notes || ""}`,
        messageType: "TEXT",
      });

      // Real-time notification to buyer
      const io = getIO();
      io.to(request.buyerId.toString()).emit("sourcing_response_received", {
        requestId: request._id,
        storeName: retailer.storeName || retailer.name,
        quotedPrice: payload.quotedPrice,
        inStockNow: payload.inStockNow,
      });
    } catch (e) {
      console.error("Chat sync for sourcing response encountered non-fatal error:", e);
    }

    return request;
  }
}

