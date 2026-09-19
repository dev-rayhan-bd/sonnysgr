import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import QueryBuilder from "../../builders/QueryBuilder";
import { BranchModel } from "./Branch.model";
import deleteOldFile from "../../../utilities/deleteFile";

const createBranchInDB = async (
  userDetails: IJwtPayload,
  profileImage: Express.Multer.File | undefined,
  coverImage: Express.Multer.File | undefined,
  payload: any,
) => {
  const { profileId } = userDetails;

  const {
    name,
    phone,
    address,
    latitude,
    longitude,
    inventoryType,
    pickupRules,
    isAcceptInAppOrder,
    isAcceptInHoldWithDeposit,
    isInStorePickupAvailable,
    operationHours,
    status,
  } = payload;

  const branchPayload: any = {
    parentRetailerId: profileId,
    name,
    phone,
    address,
    location: {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
    },
    inventoryType: inventoryType || "SHARED",
    pickupRules: pickupRules || "",
    branchSettings: {
      acceptInAppOrders:
        isAcceptInAppOrder === "true" || isAcceptInAppOrder === true,
      acceptHoldWithDeposit:
        isAcceptInHoldWithDeposit === "true" ||
        isAcceptInHoldWithDeposit === true,
      inStorePickupAvailable:
        isInStorePickupAvailable === "true" ||
        isInStorePickupAvailable === true,
    },
    operationHours: operationHours || [],
    status: status || "active",
  };
 

  if (profileImage) {
    branchPayload.profileImage = `uploads/profile-image/${profileImage.filename}`;
  }

  if (coverImage) {
    branchPayload.coverImage = `uploads/cover-image/${coverImage.filename}`;
  }

  const result = await BranchModel.create(branchPayload);
  if (!result) {
    throw new ApiError(500, "Failed to create branch.");
  }
  return result;
};

const updateBranchInDB = async (
  userDetails: IJwtPayload,
  branchId: string,
  profileImage: Express.Multer.File | undefined,
  coverImage: Express.Multer.File | undefined,
  payload: any,
) => {
  const { profileId } = userDetails;

  const branch = await BranchModel.findOne({
    _id: branchId,
    parentRetailerId: profileId,
  });
  if (!branch) {
    throw new ApiError(404, "Branch not found or unauthorized to edit.");
  }

  const {
    name,
    phone,
    address,
    latitude,
    longitude,
    inventoryType,
    pickupRules,
    isAcceptInAppOrder,
    isAcceptInHoldWithDeposit,
    isInStorePickupAvailable,
    operationHours,
    status,
  } = payload;

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (inventoryType !== undefined) updateData.inventoryType = inventoryType;
  if (pickupRules !== undefined) updateData.pickupRules = pickupRules;
  if (operationHours !== undefined) updateData.operationHours = operationHours;
  if (status !== undefined) updateData.status = status;

  if (latitude !== undefined && longitude !== undefined) {
    updateData.location = {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
    };
  }

  if (
    isAcceptInAppOrder !== undefined ||
    isAcceptInHoldWithDeposit !== undefined ||
    isInStorePickupAvailable !== undefined
  ) {
    updateData.branchSettings = {
      acceptInAppOrders:
        isAcceptInAppOrder !== undefined
          ? isAcceptInAppOrder === "true" || isAcceptInAppOrder === true
          : branch.branchSettings?.acceptInAppOrders,
      acceptHoldWithDeposit:
        isAcceptInHoldWithDeposit !== undefined
          ? isAcceptInHoldWithDeposit === "true" ||
            isAcceptInHoldWithDeposit === true
          : branch.branchSettings?.acceptHoldWithDeposit,
      inStorePickupAvailable:
        isInStorePickupAvailable !== undefined
          ? isInStorePickupAvailable === "true" ||
            isInStorePickupAvailable === true
          : branch.branchSettings?.inStorePickupAvailable,
    };
  }

  if (profileImage) {
    updateData.profileImage = `uploads/profile-image/${profileImage.filename}`;
    if (branch.profileImage) deleteOldFile(branch.profileImage);
  }

  if (coverImage) {
    updateData.coverImage = `uploads/cover-image/${coverImage.filename}`;
    if (branch.coverImage) deleteOldFile(branch.coverImage);
  }

  const result = await BranchModel.findByIdAndUpdate(
    branchId,
    { $set: updateData },
    { new: true },
  );

  return result;
};

const deleteBranchFromDB = async (
  userDetails: IJwtPayload,
  branchId: string,
) => {
  const { profileId } = userDetails;

  const branch = await BranchModel.findOne({
    _id: branchId,
    parentRetailerId: profileId,
  });
  if (!branch) {
    throw new ApiError(404, "Branch not found or unauthorized to delete.");
  }

  if (branch.profileImage) deleteOldFile(branch.profileImage);
  if (branch.coverImage) deleteOldFile(branch.coverImage);

  await BranchModel.findByIdAndDelete(branchId);
  return { message: "Branch deleted successfully" };
};

const getRetailerBranches = async (
  userDetails: IJwtPayload,
  query: Record<string, unknown>,
) => {
  const { profileId } = userDetails;

  const branchQuery = new QueryBuilder(
    BranchModel.find({ parentRetailerId: profileId }),
    query,
  )
    .search(["name", "phone", "address"])
    .filter()
    .sort()
    .paginate();

  const data = await branchQuery.modelQuery.lean();
  const meta = await branchQuery.countTotal();

  return { meta, data };
};

const getSingleBranch = async (userDetails: IJwtPayload, branchId: string) => {
  const { profileId } = userDetails;
  const branch = await BranchModel.findOne({
    _id: branchId,
    parentRetailerId: profileId,
  }).lean();
  if (!branch) {
    throw new ApiError(404, "Branch not found.");
  }
  return branch;
};

const getAllBranchesForAdmin = async (query: Record<string, unknown>) => {
  const branchQuery = new QueryBuilder(BranchModel.find(), query)
    .search(["name", "phone", "address"])
    .filter()
    .sort()
    .paginate();

  const data = await branchQuery.modelQuery.populate("parentRetailerId").lean();
  const meta = await branchQuery.countTotal();

  return { meta, data };
};

const getSingleBranchForAdmin = async (branchId: string) => {
  const branch = await BranchModel.findById(branchId)
    .populate("parentRetailerId")
    .lean();
  if (!branch) {
    throw new ApiError(404, "Branch not found.");
  }
  return branch;
};

export const BranchServices = {
  createBranchInDB,
  updateBranchInDB,
  deleteBranchFromDB,
  getRetailerBranches,
  getSingleBranch,
  getAllBranchesForAdmin,
  getSingleBranchForAdmin,
};
