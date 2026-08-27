import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { SourcingRequestModel, TrustedResellerModel } from "./Sourcing.model";
import ResellerModel from "../Reseller/Reseller.model";
import { PairsModel } from "../Pairs/Pairs.model";
import { ISourcingRequest } from "./Sourcing.interface";

/**
 * Toggle trusted status of a Reseller (Like / Unlike)
 */
const toggleTrustReseller = async (retailerId: string, resellerId: string) => {
  // Validate that reseller exists
  const reseller = await ResellerModel.findById(resellerId);
  if (!reseller) {
    throw new ApiError(404, "Reseller not found");
  }

  // Check if trust relationship already exists
  const existingTrust = await TrustedResellerModel.findOne({
    retailerId,
    resellerId,
  });

  if (existingTrust) {
    // Unlike / Remove trust
    await TrustedResellerModel.deleteOne({ _id: existingTrust._id });
    return {
      isTrusted: false,
      message: "Reseller removed from trusted list successfully.",
    };
  } else {
    // Like / Add trust
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
 * List trusted resellers populated with their profile and product info
 */
const getTrustedResellers = async (retailerId: string) => {
  // Find all active trusted relationships for the retailer
  const trustedRelations = await TrustedResellerModel.find({
    retailerId,
    status: "active",
  }).lean();

  const resellerIds = trustedRelations.map((rel) => rel.resellerId);

  // Retrieve reseller profiles
  const resellers = await ResellerModel.find({
    _id: { $in: resellerIds },
  }).lean();

  // Retrieve reseller inventory (Pairs)
  const inventory = await PairsModel.find({
    resellerId: { $in: resellerIds },
    productStatus: "active",
    isSold: false,
  }).lean();

  // Combine resellers with their respective inventory items
  const result = resellers.map((reseller: any) => {
    const resellerProducts = inventory.filter(
      (item: any) => item.resellerId.toString() === reseller._id.toString()
    );
    return {
      ...reseller,
      products: resellerProducts,
    };
  });

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

  // 1. Verify reseller is trusted by the retailer
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

  // 2. Verify pair product exists and belongs to the reseller
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

  // 3. Verify variant stock availability
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

  // 4. Create the request
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

  return await SourcingRequestModel.find(query)
    .populate("resellerId")
    .populate("pairId")
    .sort({ createdAt: -1 });
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
      // 1. Double check pair variant stock in transaction
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

      // 2. Deduct inventory stock
      pair.variant[matchedVariantIndex].stock -= request.variant.quantity;

      // If total stock of all variants drops to 0, mark the Pair as sold
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
  getTrustedResellers,
  createSourcingRequest,
  getRetailerSourcingRequests,
  getResellerSourcingRequests,
  respondToSourcingRequest,
};

export default SourcingServices;
