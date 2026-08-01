import ApiError from "../../../error/ApiError";
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

  // Enforce one drop at a time (like a single banner)
  await DropModel.deleteMany({});

  const imageUrls = files ? files.map(file => `uploads/product-image/${file.filename}`) : [];

  let accessDetailsObj = payload.AccessDetails;
  if (typeof accessDetailsObj === "string") {
    accessDetailsObj = JSON.parse(accessDetailsObj);
  }

  const dropData = {
    ...payload,
    dropImages: imageUrls,
    AccessDetails: accessDetailsObj,
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

  const drop = await DropModel.findById(id);
  if (!drop) {
    throw new ApiError(404, "Drop not found");
  }

  if (files && files.length > 0) {
    const imageUrls = files.map(file => `uploads/product-image/${file.filename}`);
    payload.dropImages = imageUrls;
  }

  if (payload.AccessDetails) {
    let accessDetailsObj = payload.AccessDetails;
    if (typeof accessDetailsObj === "string") {
      accessDetailsObj = JSON.parse(accessDetailsObj);
    }
    payload.AccessDetails = accessDetailsObj;
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

  const result = await DropModel.findByIdAndDelete(id);
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

  const drop = await DropModel.findOne({});
  return drop;
};

const DropServices = {
  createDropService,
  editDropService,
  deleteDropService,
  getDropService,
};

export default DropServices;
