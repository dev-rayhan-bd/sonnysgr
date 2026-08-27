import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { TrustedResellerModel } from "./Sourcing.model";
import ResellerModel from "../Reseller/Reseller.model";
import { PairsModel } from "../Pairs/Pairs.model";

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
 * Get reseller products by reseller ID with filtering and pagination
 */
const getResellerProducts = async (
  resellerId: string,
  query: Record<string, unknown>
) => {
  const reseller = await ResellerModel.findById(resellerId);
  if (!reseller) {
    throw new ApiError(404, "Reseller not found");
  }

  let {
    type,
    page,
    limit,
    brand,
    variant,
    gender,
    size,
  } = query;

  const filter: Record<string, any> = {
    resellerId: new mongoose.Types.ObjectId(resellerId),
    productStatus: { $ne: "inactive" },
    isSold: { $ne: true },
    isVisibleToStore: { $ne: false },
  };

  if (type) {
    filter.type = type;
  }

  if (brand) {
    filter.brand = brand;
  }

  const variantFilter: Record<string, any> = {};

  const targetGender = (gender as string) || (variant as string);
  if (targetGender) {
    const formattedGender =
      targetGender.trim().charAt(0).toUpperCase() +
      targetGender.trim().slice(1).toLowerCase();

    const validGenders = ["Men", "Women", "Kids"];
    if (!validGenders.includes(formattedGender)) {
      throw new ApiError(
        400,
        `Invalid gender value. Supported values are: ${validGenders.join(", ")}`
      );
    }
    variantFilter.gender = formattedGender;
  }

  if (size !== undefined && size !== null) {
    const formattedSize = String(size).trim();
    if (formattedSize.length === 0) {
      throw new ApiError(400, "Size filter value cannot be empty.");
    }
    variantFilter.size = formattedSize;
  }

  if (Object.keys(variantFilter).length > 0) {
    filter.variant = { $elemMatch: variantFilter };
  }

  page = parseInt(page as any) || 1;
  limit = parseInt(limit as any) || 10;
  let skip = ((page as number) - 1) * (limit as number);

  const [pairs, totalPairs] = await Promise.all([
    PairsModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit as number)
      .lean(),
    PairsModel.countDocuments(filter),
  ]);

  const totalPage = Math.ceil(totalPairs / (limit as number));
  const hasNextPage = (page as number) < totalPage;

  return {
    meta: {
      page: page as number,
      limit: limit as number,
      total: totalPairs,
      totalPage,
      hasNextPage,
    },
    products: pairs,
  };
};

const SourcingServices = {
  toggleTrustReseller,
  getAllActiveResellers,
  getTrustedResellers,
  getResellerProducts,
  enrichResellerProfile,
};

export default SourcingServices;
