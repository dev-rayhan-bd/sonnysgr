import { NextFunction, Request, Response } from "express";
import UserModel from "../modules/User/User.model";
import ApiError from "../../error/ApiError";
import { IJwtPayload } from "../../interface/jwt.interface";

//middleware to check subscription plan
export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { profileId } = req.user as IJwtPayload; // assuming auth middleware attaches user

  const user = await UserModel.findById(profileId);

  if (!user) {
    throw new ApiError(404, "User not found to check subscription plan.");
  }

  // 1️⃣ If user has subscription
  if (user?.subscription?.isSubscribed) {
    return next();
  }

  // 3️⃣ Limit reached
  throw new ApiError(403, "Please buy subscription plan to unlock everything.");
};

//middleware to check matching count
export const checkMatchLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { profileId } = req.user as IJwtPayload; // assuming auth middleware attaches user

  const user = await UserModel.findById(profileId);

  if (!user) {
    throw new ApiError(404, "User not found to check subscription plan.");
  }

  // 1️⃣ If user has subscription
  if (user?.subscription?.isSubscribed) {
    return next();
  }

  // 2️⃣ Check matchCount
  if (user.matchCount < 3) {

    // increase match count
    await UserModel.findByIdAndUpdate(profileId, {
      $inc: { matchCount: 1 }
    });

    return next();
  }

  // 3️⃣ Limit reached
  throw new ApiError(403, "You have reached your limit. Please buy subscription plan for unlimited matching.");
};

// const user = await UserModel.findOneAndUpdate(
//   {
//     _id: profileId,
//     matchCount: { $lt: 3 }
//   },
//   {
//     $inc: { matchCount: 1 }
//   },
//   { new: true }
// );

// export const checkMatchLimit = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { profileId } = req.user as any;

//   // Step 1: check if user has subscription
//   const subscribedUser = await UserModel.findOne({
//     _id: profileId,
//     "subscription.isSubscribed": true,
//   });

//   if (subscribedUser) {
//     return next();
//   }

//   // Step 2: user is NOT subscribed → apply limit
//   const user = await UserModel.findOneAndUpdate(
//     {
//       _id: profileId,
//       matchCount: { $lt: 3 },
//     },
//     {
//       $inc: { matchCount: 1 },
//     },
//     { new: true }
//   );

//   // Step 3: if null → limit reached
//   if (!user) {
//     throw new ApiError(403, "You have reached your limit.");
//   }

//   return next();
// };