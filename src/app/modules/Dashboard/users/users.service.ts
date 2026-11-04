import ApiError from "../../../../error/ApiError";
import AuthModel from "../../auth/auth.model";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import { PairsModel, ProductRequestModel } from "../../Pairs/Pairs.model";
import { ProductModel } from "../../Product/Product.model";
import QueryBuilder from "../../../builder/QueryBuilder";
import { IUpdateUserStatusPayload } from "./users.interface";

const getAllUsersService = async (query: Record<string, any>) => {
  let profileIds: any[] = [];
  const search = query.searchTerm || query.searchText;

  if (search) {
    const [buyers, retailers, resellers] = await Promise.all([
      BuyerModel.find({ name: { $regex: search, $options: "i" } }).select("_id"),
      RetailerModel.find({ name: { $regex: search, $options: "i" } }).select("_id"),
      ResellerModel.find({ name: { $regex: search, $options: "i" } }).select("_id"),
    ]);

    profileIds = [
      ...buyers.map((b) => b._id),
      ...retailers.map((r) => r._id),
      ...resellers.map((r) => r._id),
    ];
  }

  // Exclude auth credentials like password
  const userQuery = AuthModel.find().select("-password").populate("profile");
  
  const queryBuilder = new QueryBuilder(userQuery, query)
    .sort()
    .paginate();

  if (search) {
    queryBuilder.modelQuery = queryBuilder.modelQuery.find({
      $or: [
        { email: { $regex: search, $options: "i" } },
        { profile: { $in: profileIds } },
      ],
    });
  }

  if (query.role) {
    queryBuilder.modelQuery = queryBuilder.modelQuery.find({ role: query.role });
  }

  if (query.status) {
    queryBuilder.modelQuery = queryBuilder.modelQuery.find({ status: query.status });
  }

  const data = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return {
    meta,
    data,
  };
};

const getSingleUserService = async (id: string) => {
  const user = await AuthModel.findById(id).select("-password").populate("profile");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  return user;
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
const approveRetailerStoreService = async (id: string) => {
  const retailer = await RetailerModel.findById(id);
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }

  if (retailer.isApproved) {
    throw new ApiError(400, "Retailer store is already approved.");
  }

  retailer.isApproved = true;
  await retailer.save();

  return retailer;
};

const reviewRetailerStoreService = async (id: string, action: "Approve" | "Reject") => {
  const retailer = await RetailerModel.findById(id);
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }

  if (action === "Approve") {
    retailer.isApproved = true;
  } else {
    retailer.isApproved = false;
  }

  await retailer.save();
  return retailer;
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

const getRetailerAnalyticsService = async (id: string) => {
  const retailer = await RetailerModel.findById(id);
  if (!retailer) {
    throw new ApiError(404, "Retailer store not found.");
  }

  const totalProducts = await ProductModel.countDocuments({ retailerId: retailer._id });

  return {
    storeName: retailer.name,
    totalProducts,
    totalSales: 0,
    totalRevenue: 0,
    storeViews: 120,
    conversionRate: "2.5%",
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
  getAllUsersService,
  getSingleUserService,
  updateUserStatusService,
  approveRetailerStoreService,
  reviewRetailerStoreService,
  suspendReactivateStoreService,
  getRetailerDocumentsService,
  getRetailerAnalyticsService,
  verifyResellerService,
  getResellerInventoryService,
  adjustResellerTrustScoreService,
};

export default usersDashboardServices;
