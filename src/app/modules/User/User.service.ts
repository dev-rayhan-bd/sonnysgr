import ApiError from "../../../error/ApiError";
import { Express } from "express";
import { IChangePassword, IUser, TaddDate } from "./User.interface";
import UserModel from "./User.model";
import { JwtPayload } from "jsonwebtoken";
import deleteOldFile from "../../../utilities/deleteFile";
import { IJwtPayload } from "../../../interface/jwt.interface";
import AuthModel from "../auth/auth.model";
import BuyerModel from "../Buyer/Buyer.model";
import { IBuyer } from "../Buyer/Buyer.interface";
import AuthServices from "../auth/auth.service";

const updateUserProfile = async (
  userDetails: IJwtPayload,
  file: Express.Multer.File | undefined,
  payload: any
) => {
  let imagePath: string | undefined;
  if (file) {
    imagePath = `uploads/profile-image/${file.filename}`;
  }
  return await AuthServices.updateMyProfileService(userDetails, payload, imagePath);
};

const getMyProfile = async (userDetails: JwtPayload) => {
  return await AuthServices.getMyProfileService(userDetails);
};

const changePasswordService = async (
  userDetails: IJwtPayload,
  payload: IChangePassword
) => {
  return await AuthServices.changePasswordService(userDetails, payload);
};

//dashboard

const getAllUserService = async (query: Record<string, unknown>) => {
  let { page, searchText } = query;

  //if searchText is true
  if (searchText) {
    const users = await BuyerModel.find({
      $or: [
        { name: { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } },
      ],
    })
      .populate({ path: "auth", select: "isBlocked" })
      .lean();

    return users;
  }

  //pagination
  page = parseInt(page as any) || 1;
  let limit = 10;
  let skip = ((page as number) - 1) * limit;

  const [users, totalUser] = await Promise.all([
    BuyerModel.find({})
      .populate({ path: "auth", select: "isBlocked" })
      .select("name image email createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    BuyerModel.countDocuments({}),
  ]);

  const totalPage = Math.ceil(totalUser / limit);

  return {
    meta: { page, limit: 10, total: totalUser, totalPage },
    users,
  };
};

const blockUserService = async (id: string) => {
  const auth = await AuthModel.findById(id);

  if (!auth) {
    throw new ApiError(404, "User not found to block.");
  }

  auth.isBlocked = !auth.isBlocked;

  let msg = auth.isBlocked
    ? "User has been blocked."
    : "User has been unblocked.";

  await auth.save();

  return {
    user: { email: auth.email, isBlocked: auth.isBlocked },
    msg,
  };
};

const UserServices = {
  updateUserProfile,
  getMyProfile,
  changePasswordService,
  getAllUserService,
  blockUserService,
};
export default UserServices;
