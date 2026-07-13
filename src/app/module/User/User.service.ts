import ApiError from "../../../error/ApiError";
import { Express } from "express";
import {  IChangePassword, IUser, TaddDate } from "./User.interface";
import UserModel from "./User.model";
import { JwtPayload } from "jsonwebtoken";
import deleteOldFile from "../../../utilities/deleteFile";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { email } from "zod";
import AuthModel from "../auth/auth.model";
import BuyerModel from "../Buyer/Buyer.model";
import { IBuyer } from "../Buyer/Buyer.interface";



const updateUserProfile = async (
    userDetails: IJwtPayload,
    file: Express.Multer.File | undefined,
    payload: any
) => {
  const { profileId } = userDetails;

  // Fetch user and profile in parallel
  const user = await BuyerModel.findById(profileId);
   

  if (!user ) {
    throw new ApiError(404, "Profile not found to update.");
  }


  // Handle image update
  if (file) {

    if (user.image) deleteOldFile(user.image as string);

    // user.image = `uploads/profile-image/${file.filename}`;

    payload.image = `uploads/profile-image/${file.filename}`;

    // await user.save();

  }

  // Save both

  const updatedUser = await BuyerModel.findByIdAndUpdate(
    profileId,
    ...payload
  );

  return updatedUser;
};

const getMyProfile = async (userDetails: JwtPayload) => {

    const {profileId} = userDetails;
    
    const user = await UserModel.findById(profileId);

    if(!user){
        throw new ApiError(404,"failed to get profile detail.");
    }

    return user;
    
}


const changePasswordService = async (userDetails: IJwtPayload, payload: IChangePassword) => {
    // Service logic goes here
    const { authId } = userDetails;
    const { currentPassword, newPassword } = payload;

    const user =  await UserModel.findById(authId).select('+password');
    if(!user){
        throw new ApiError(404,'User not found to change password.');
    }

    // const isPasswordMatched = await user.isPasswordMatched(oldPassword);
    // if(!isPasswordMatched){
    //     throw new ApiError(400,'Old password is incorrect');
    // }
    if(user.password !== currentPassword){
        throw new ApiError(400,'Current password is incorrect.');
    }

    user.password = newPassword;
    await user.save();

    return null;
}



//dashboard

const getAllUserService = async (query: Record<string,unknown>) => {

    let {page, searchText} = query;

    //if searchText is true
    if(searchText){
        const users = await BuyerModel.find({
             $or: [
                    { name: { $regex: searchText, $options: "i" } },
                    { email: { $regex: searchText, $options: "i" } },
                ]
        }) .populate({path: "auth", select:"isBlocked"}).lean();

        return users;

    }

    //pagination
    page = parseInt(page as any) || 1;
    let limit = 10;
    let skip = (page as number - 1) * limit;


    const [users, totalUser] = await Promise.all([

        BuyerModel.find({})
            .populate({path: "auth", select:"isBlocked"})
                .select("name image email createdAt")
                .sort({createdAt: -1})
                    .skip(skip).limit(limit)
                        .lean(),
    
        BuyerModel.countDocuments({})
    ])

    const totalPage = Math.ceil(totalUser / limit);

    return {
        meta:{page,limit: 10,total: totalUser, totalPage},
        users
    };
}

const blockUserService = async (id: string) => {
    
    // if(!authId){
    //     throw new ApiError(400,"User id is required to block a user");
    // }

    const auth = await AuthModel.findById(id);

    if(!auth){
        throw new ApiError(404,"User not found to block.");
    }

    auth.isBlocked = !auth.isBlocked;

    let msg = auth.isBlocked ? "User has been blocked." : "User has been unblocked.";

    await auth.save();

    return {
        user: { name: auth.name, email: auth.email, isBlocked: auth.isBlocked },
        msg
    };
}

const UserServices = {
    updateUserProfile, 
    getMyProfile,
    changePasswordService ,
    getAllUserService,
    blockUserService
};
export default UserServices;