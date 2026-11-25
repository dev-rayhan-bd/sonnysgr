import ApiError from "../../../error/ApiError";
import { uploadFilesToCloudUrls } from "../../../helper/cloudStorage";
import { IJwtPayload } from "../../../interface/jwt.interface";
import AuthModel from "../auth/auth.model";
import DropModel from "./Drop.model";
import { IDrop } from "./Drop.interface";

const createDropService = async (
  userDetails: IJwtPayload,
  files: Express.Multer.File[],
  payload: any
) => {
  const auth = await AuthModel.findById(userDetails.authId);
  if (!auth || auth.status !== "Active") {
    throw new ApiError(403, "user.status == suspanded user can not perform add product");
  }

  // Enforce one drop at a time per retailer (like a single banner) — only this retailer's drops are replaced
  await DropModel.deleteMany({ retailerId: userDetails.profileId });

  const imageUrls = await uploadFilesToCloudUrls(files, "drops");

  // Parse types from form-data payload
  const vipEalryAccess = payload.vipEalryAccess === "true" || payload.vipEalryAccess === true;
  const raffledrop = payload.raffledrop === "true" || payload.raffledrop === true;
  const earlyMinustes = Number(payload.earlyMinustes) || 0;
  const maximumEntries = Number(payload.maximumEntries) || 0;

  const availablePairs = Number(payload.availablePairs) || 0;
  const estimatedDemand = payload.estimatedDemand || "";
  const staus = payload.staus || "upcomming";

  // Moderation state is admin-controlled; a new drop always starts as Pending
  delete payload.approvalStatus;
  delete payload.rejectionReason;

  const dropData = {
    ...payload,
    retailerId: userDetails.profileId,
    dropImages: imageUrls,
    vipEalryAccess,
    raffledrop,
    earlyMinustes,
    maximumEntries,
    stockAvailablity: {
      availablePairs,
      estimatedDemand,
      staus,
    },
  };

  const result = await DropModel.create(dropData);
  if (!result) {
    throw new ApiError(500, "Failed to create Drop");
  }

  return result;
};

const editDropService = async (
  userDetails: IJwtPayload,
  id: string,
  files: Express.Multer.File[],
  payload: any
) => {
  const auth = await AuthModel.findById(userDetails.authId);
  if (!auth || auth.status !== "Active") {
    throw new ApiError(403, "user.status == suspanded user can not perform add product");
  }

  const drop = await DropModel.findOne({ _id: id, retailerId: userDetails.profileId });
  if (!drop) {
    throw new ApiError(404, "Drop not found");
  }

  // Ownership and moderation state are not editable via payload
  delete payload.retailerId;
  delete payload.approvalStatus;
  delete payload.rejectionReason;

  if (files && files.length > 0) {
    const imageUrls = await uploadFilesToCloudUrls(files, "drops");
    payload.dropImages = imageUrls;
  }

  // Parse types from form-data payload if provided
  if (payload.vipEalryAccess !== undefined) {
    payload.vipEalryAccess = payload.vipEalryAccess === "true" || payload.vipEalryAccess === true;
  }
  if (payload.raffledrop !== undefined) {
    payload.raffledrop = payload.raffledrop === "true" || payload.raffledrop === true;
  }
  if (payload.earlyMinustes !== undefined) {
    payload.earlyMinustes = Number(payload.earlyMinustes) || 0;
  }
  if (payload.maximumEntries !== undefined) {
    payload.maximumEntries = Number(payload.maximumEntries) || 0;
  }

  // Handle stockAvailablity nested update if flat fields are provided
  if (payload.availablePairs !== undefined || payload.estimatedDemand !== undefined || payload.staus !== undefined) {
    const currentStock = drop.stockAvailablity || { availablePairs: 0, estimatedDemand: "", staus: "upcomming" };
    const availablePairs = payload.availablePairs !== undefined ? Number(payload.availablePairs) : currentStock.availablePairs;
    const estimatedDemand = payload.estimatedDemand !== undefined ? payload.estimatedDemand : currentStock.estimatedDemand;
    const staus = payload.staus !== undefined ? payload.staus : currentStock.staus;

    payload.stockAvailablity = {
      availablePairs,
      estimatedDemand,
      staus,
    };
  }

  Object.assign(drop, payload);
  await drop.save();

  return drop;
};

const deleteDropService = async (userDetails: IJwtPayload, id: string) => {
  const auth = await AuthModel.findById(userDetails.authId);
  if (!auth || auth.status !== "Active") {
    throw new ApiError(403, "user.status == suspanded user can not perform add product");
  }

  const result = await DropModel.findOneAndDelete({ _id: id, retailerId: userDetails.profileId });
  if (!result) {
    throw new ApiError(404, "Drop not found");
  }

  return null;
};

const getDropService = async (userDetails: IJwtPayload) => {
  const auth = await AuthModel.findById(userDetails.authId);
  if (!auth || auth.status !== "Active") {
    throw new ApiError(403, "user.status == suspanded user can not perform add product");
  }

  const drop = await DropModel.findOne({ retailerId: userDetails.profileId });
  return drop;
};

const DropServices = {
  createDropService,
  editDropService,
  deleteDropService,
  getDropService,
};

export default DropServices;
