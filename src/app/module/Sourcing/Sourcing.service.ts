import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { SourcingRequestModel, TrustedResellerModel } from "./Sourcing.model";
import ResellerModel from "../Reseller/Reseller.model";
import { PairsModel } from "../Pairs/Pairs.model";
import { ISourcingRequest } from "./Sourcing.interface";

/**
 * Helper to dynamically enrich a Reseller profile with trust status and trust count.
 */
const enrichResellerProfile = async (reseller: any, retailerId: string) => {
  if (!reseller) return reseller;
  const resellerIdStr = reseller._id.toString();

  const trustCount = await TrustedResellerModel.countDocuments({
    resellerId: resellerIdStr,
    status: "active",
  });

  const personalTrust = await TrustedResellerModel.findOne({
    retailerId,
    resellerId: resellerIdStr,
    status: "active",
  });

  return {
    ...reseller,
    trustCount,
    trustStatus: personalTrust ? "Trusted" : "Normal",
  };
};

/**
 * Toggle trusted status of a Reseller (Like / Unlike)
 */
const toggleTrustReseller = async (retailerId: string, resellerId: string) => {
  const reseller = await ResellerModel.findById(resellerId);
  if (!reseller) {
    throw new ApiError(404, "Reseller not found");
  }

  const existingTrust = await TrustedResellerModel.findOne({
    retailerId,
    resellerId,
  });

  if (existingTrust) {
    await TrustedResellerModel.deleteOne({ _id: existingTrust._id });
    return {
      isTrusted: false,
      message: "Reseller removed from trusted list successfully.",
    };
  } else {
    await TrustedResellerModel.create({
      retailerId,
      resellerId,
      status: "active",
    });
    return {
      isTrusted: true,
      message: "Reseller added to trusted list successfully.",
    };
  }
};

/**
 * List all active approved resellers with their trust details
 */
const getAllActiveResellers = async (retailerId: string) => {
  const resellers = await ResellerModel.find({ isApproved: true }).lean();

  const enrichedResellers = await Promise.all(
    resellers.map((reseller) => enrichResellerProfile(reseller, retailerId))
  );

  return enrichedResellers;
};

/**
 * List trusted resellers populated with their profile and product info
 */
const getTrustedResellers = async (retailerId: string) => {
  const trustedRelations = await TrustedResellerModel.find({
    retailerId,
    status: "active",
  }).lean();

  const resellerIds = trustedRelations.map((rel) => rel.resellerId);

  const resellers = await ResellerModel.find({
    _id: { $in: resellerIds },
  }).lean();

  const inventory = await PairsModel.find({
    resellerId: { $in: resellerIds },
    productStatus: "active",
    isSold: false,
  }).lean();

  const result = await Promise.all(
    resellers.map(async (reseller: any) => {
      const resellerProducts = inventory.filter(
        (item: any) => item.resellerId.toString() === reseller._id.toString()
      );
      const enrichedReseller = await enrichResellerProfile(reseller, retailerId);
      return {
        ...enrichedReseller,
        products: resellerProducts,
      };
    })
  );

  return result;
};

/**
 * Send a Sourcing Request
 */
const createSourcingRequest = async (
  retailerId: string,
  payload: Partial<ISourcingRequest>
) => {
  const { resellerId, pairId, variant } = payload;

  if (!resellerId || !pairId || !variant) {
    throw new ApiError(400, "Missing required sourcing parameters.");
  }

  const isTrusted = await TrustedResellerModel.findOne({
    retailerId,
    resellerId,
    status: "active",
  });
  if (!isTrusted) {
    throw new ApiError(
      400,
      "You can only send sourcing requests to trusted resellers."
    );
  }

  const pair = await PairsModel.findOne({
    _id: pairId,
    resellerId,
    productStatus: "active",
    isSold: false,
  });
  if (!pair) {
    throw new ApiError(
      404,
      "Product variant not found or not active in the reseller's inventory."
    );
  }

  const matchedVariant = pair.variant?.find(
    (v: any) =>
      v.gender === variant.gender && v.size.toString() === variant.size.toString()
  );

  if (!matchedVariant) {
    throw new ApiError(
      400,
      `Requested variant (${variant.gender}, Size: ${variant.size}) does not exist for this product.`
    );
  }

  if (matchedVariant.stock < variant.quantity) {
    throw new ApiError(
      400,
      `Insufficient stock. Available stock is ${matchedVariant.stock}, but requested ${variant.quantity}.`
    );
  }

  const sourcingRequest = await SourcingRequestModel.create({
    retailerId,
    resellerId,
    pairId,
    variant,
    status: "Pending",
  });

  return sourcingRequest;
};

/**
 * Fetch sourcing requests sent by a Retailer
 */
const getRetailerSourcingRequests = async (retailerId: string, status?: string) => {
  const query: Record<string, any> = { retailerId };
  if (status) {
    query.status = status;
  }

  const requests = await SourcingRequestModel.find(query)
    .populate("resellerId")
    .populate("pairId")
    .sort({ createdAt: -1 })
    .lean();

  const enrichedRequests = await Promise.all(
    requests.map(async (req: any) => {
      if (req.resellerId) {
        req.resellerId = await enrichResellerProfile(req.resellerId, retailerId);
      }
      return req;
    })
  );

  return enrichedRequests;
};

/**
 * Fetch sourcing requests received by a Reseller
 */
const getResellerSourcingRequests = async (resellerId: string, status?: string) => {
  const query: Record<string, any> = { resellerId };
  if (status) {
    query.status = status;
  }

  return await SourcingRequestModel.find(query)
    .populate("retailerId")
    .populate("pairId")
    .sort({ createdAt: -1 });
};

/**
 * Accept or reject a sourcing request (by Reseller)
 */
const respondToSourcingRequest = async (
  resellerId: string,
  requestId: string,
  status: "Accepted" | "Rejected",
  rejectionReason?: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await SourcingRequestModel.findOne({
      _id: requestId,
      resellerId,
    }).session(session);

    if (!request) {
      throw new ApiError(404, "Sourcing request not found.");
    }

    if (request.status !== "Pending") {
      throw new ApiError(
        400,
        `Sourcing request has already been ${request.status.toLowerCase()}.`
      );
    }

    if (status === "Rejected") {
      request.status = "Rejected";
      request.rejectionReason = rejectionReason || "Product not available";
      await request.save({ session });
    } else if (status === "Accepted") {
      const pair = await PairsModel.findOne({
        _id: request.pairId,
        resellerId,
      }).session(session);

      if (!pair || pair.isSold || pair.productStatus !== "active") {
        throw new ApiError(400, "Product is no longer active or sold out.");
      }

      const matchedVariantIndex = pair.variant?.findIndex(
        (v: any) =>
          v.gender === request.variant.gender &&
          v.size.toString() === request.variant.size.toString()
      );

      if (matchedVariantIndex === -1 || matchedVariantIndex === undefined) {
        throw new ApiError(400, "Product variant is no longer available.");
      }

      const matchedVariant = pair.variant[matchedVariantIndex];

      if (matchedVariant.stock < request.variant.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock to fulfill request. Available stock: ${matchedVariant.stock}`
        );
      }

      pair.variant[matchedVariantIndex].stock -= request.variant.quantity;

      const totalStock = pair.variant.reduce((sum: number, v: any) => sum + v.stock, 0);
      if (totalStock <= 0) {
        pair.isSold = true;
      }

      await pair.save({ session });

      request.status = "Accepted";
      await request.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return request;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const SourcingServices = {
  toggleTrustReseller,
  getAllActiveResellers,
  getTrustedResellers,
  createSourcingRequest,
  getRetailerSourcingRequests,
  getResellerSourcingRequests,
  respondToSourcingRequest,
};

export default SourcingServices;
