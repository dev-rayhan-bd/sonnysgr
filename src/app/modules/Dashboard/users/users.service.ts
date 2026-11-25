import mongoose from "mongoose";
import ApiError from "../../../../error/ApiError";
import AuthModel from "../../auth/auth.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import { PairsModel, ProductRequestModel } from "../../Pairs/Pairs.model";
import { ProductModel } from "../../Product/Product.model";
import { OrderItemModel } from "../../Order/Order.model";
import AnalyticsModel from "../../Analytics/Analytics.model";
import NotificationHelper from "../../../../helper/notification";
import { ENUM_NOTIFICATION_TYPE } from "../../../../utilities/enum";
import { SOLD_ITEM_STATUSES } from "../dashboard.shared";
import { IUpdateUserStatusPayload } from "./users.interface";
import usersQueryServices from "./users.query.service";

type TStoreReviewAction = "Approve" | "Reject" | "UnderReview" | "RequestMoreInfo";

const STORE_REVIEW_STATUS: Record<TStoreReviewAction, string> = {
  Approve: "Approved",
  Reject: "Rejected",
  UnderReview: "Under Review",
  RequestMoreInfo: "More Info Requested",
};

const updateUserStatusService = async (id: string, payload: IUpdateUserStatusPayload) => {
  const user = await AuthModel.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found to update status.");
  }

  user.status = payload.status;
  user.statusReason = payload.reason || "";
  user.statusUpdatedAt = new Date();

  // If role is banned, set isBlocked to true, otherwise false
  if (payload.status === "Banned") {
    user.isBlocked = true;
  } else {
    user.isBlocked = false;
  }

  await user.save();
  return user;
};

// Retailer Specific Services

/** Move a store through the review workflow and tell the retailer what happened. */
const reviewRetailerStoreService = async (id: string, action: TStoreReviewAction, note = "") => {
  const retailer = await RetailerModel.findById(id);
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }

  const approvalStatus = STORE_REVIEW_STATUS[action];
  retailer.approvalStatus = approvalStatus;
  retailer.approvalNote = note;
  retailer.approvalUpdatedAt = new Date();
  // isApproved stays the single flag the rest of the app reads
  retailer.isApproved = action === "Approve";
  await retailer.save();

  await NotificationHelper.createNotification({
    toId: String(retailer._id),
    toModel: "Retailer",
    title: `Store application: ${approvalStatus}`,
    description: note || `Your store application status is now "${approvalStatus}".`,
    type: ENUM_NOTIFICATION_TYPE.STORE_REVIEW_UPDATE,
    referenceId: String(retailer._id),
    referenceModel: "Retailer",
  });

  return retailer;
};

const approveRetailerStoreService = async (id: string) => {
  const retailer = await RetailerModel.findById(id).select("isApproved").lean<{ isApproved: boolean }>();
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }

  if (retailer.isApproved) {
    throw new ApiError(400, "Retailer store is already approved.");
  }

  return reviewRetailerStoreService(id, "Approve");
};

const suspendReactivateStoreService = async (id: string, action: "Suspend" | "Reactivate") => {
  const retailer = await RetailerModel.findById(id);
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }

  const auth = await AuthModel.findOne({ profile: retailer._id });
  if (!auth) {
    throw new ApiError(404, "Associated credentials not found.");
  }

  if (action === "Suspend") {
    auth.status = "Suspended";
  } else {
    auth.status = "Active";
  }

  auth.statusUpdatedAt = new Date();
  await auth.save();

  return {
    retailer,
    auth,
  };
};

const getRetailerDocumentsService = async (id: string) => {
  const retailer = await RetailerModel.findById(id).select("license name email");
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }
  return retailer;
};

/** Real store analytics computed from orders, products and view counters. */
const getRetailerAnalyticsService = async (id: string) => {
  const retailer = await RetailerModel.findById(id)
    .select("name averageRating followersCount")
    .lean<{ _id: mongoose.Types.ObjectId; name: string; averageRating: number; followersCount: number }>();
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }

  const [totalProducts, [sales], [views]] = await Promise.all([
    ProductModel.countDocuments({ retailerId: retailer._id }),
    OrderItemModel.aggregate([
      { $match: { retailerId: retailer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: "$orderId" },
          completedOrders: {
            $addToSet: { $cond: [{ $in: ["$status", SOLD_ITEM_STATUSES] }, "$orderId", "$$REMOVE"] },
          },
          totalSales: { $sum: { $cond: [{ $in: ["$status", SOLD_ITEM_STATUSES] }, "$quantity", 0] } },
          totalRevenue: { $sum: { $cond: [{ $in: ["$status", SOLD_ITEM_STATUSES] }, "$totalPrice", 0] } },
        },
      },
      {
        $project: {
          totalOrders: { $size: "$totalOrders" },
          completedOrders: { $size: "$completedOrders" },
          totalSales: 1,
          totalRevenue: 1,
        },
      },
    ]),
    AnalyticsModel.aggregate([
      { $match: { retailerId: retailer._id } },
      { $group: { _id: null, storeViews: { $sum: "$profileViewCount" }, productViews: { $sum: "$productViewCount" } } },
    ]),
  ]);

  const storeViews: number = views?.storeViews || 0;
  const completedOrders: number = sales?.completedOrders || 0;

  return {
    storeName: retailer.name,
    totalProducts,
    totalOrders: sales?.totalOrders || 0,
    completedOrders,
    totalSales: sales?.totalSales || 0,
    totalRevenue: sales?.totalRevenue || 0,
    storeViews,
    productViews: views?.productViews || 0,
    // null when there is no view data to divide by
    conversionRate: storeViews > 0 ? `${((completedOrders / storeViews) * 100).toFixed(1)}%` : null,
    averageRating: retailer.averageRating || 0,
    followersCount: retailer.followersCount || 0,
  };
};

// Reseller Specific Services
const verifyResellerService = async (id: string) => {
  const reseller = await ResellerModel.findById(id);
  if (!reseller) {
    throw new ApiError(404, "Reseller profile not found.");
  }

  if (reseller.isApproved) {
    throw new ApiError(400, "Reseller is already verified/approved.");
  }

  reseller.isApproved = true;
  await reseller.save();

  return reseller;
};

const rejectResellerService = async (id: string, reason: string) => {
  const reseller = await ResellerModel.findById(id);
  if (!reseller) {
    throw new ApiError(404, "Reseller profile not found.");
  }

  reseller.isApproved = false;
  await reseller.save();

  await NotificationHelper.createNotification({
    toId: String(reseller._id),
    toModel: "Reseller",
    title: "Reseller verification rejected",
    description: reason,
    type: ENUM_NOTIFICATION_TYPE.STORE_REVIEW_UPDATE,
    referenceId: String(reseller._id),
    referenceModel: "Reseller",
  });

  return reseller;
};

const getResellerInventoryService = async (id: string) => {
  const reseller = await ResellerModel.findById(id);
  if (!reseller) {
    throw new ApiError(404, "Reseller profile not found.");
  }

  const activeListing = await PairsModel.find({ resellerId: reseller._id });
  const customRequests = await ProductRequestModel.find({ resellerId: reseller._id });

  return {
    resellerName: reseller.name,
    activeListing,
    customRequests,
  };
};

const adjustResellerTrustScoreService = async (id: string, trustScore: number) => {
  const reseller = await ResellerModel.findById(id);
  if (!reseller) {
    throw new ApiError(404, "Reseller profile not found.");
  }

  reseller.trustScore = trustScore;
  await reseller.save();

  return reseller;
};

const usersDashboardServices = {
  ...usersQueryServices,
  updateUserStatusService,
  approveRetailerStoreService,
  reviewRetailerStoreService,
  suspendReactivateStoreService,
  getRetailerDocumentsService,
  getRetailerAnalyticsService,
  verifyResellerService,
  rejectResellerService,
  getResellerInventoryService,
  adjustResellerTrustScoreService,
};

export default usersDashboardServices;
