import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import BuyerModel from "../Buyer.model";
import AuthModel from "../../auth/auth.model";
import { FollowModel } from "../../Engagement/Engagement.model";
import { IBuyerNotification } from "../Buyer.interface";
import { uploadToCloud, deleteFromCloud } from "../../../../helper/cloudStorage";

/**
 * Sub-Service dedicated to Buyer Profile, Onboarding, Preferences & Notifications
 */
export class BuyerProfileSubService {
  /**
   * Set notification preferences
   */
  static async setBuyerNotificationAlerts(
    userDetails: IJwtPayload,
    payload: IBuyerNotification
  ) {
    const { profileId } = userDetails;

    const buyer = await BuyerModel.findByIdAndUpdate(
      profileId,
      { $set: { notification: payload } },
      { new: true }
    );

    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found.");
    }

    return buyer.notification;
  }

  /**
   * Add selected shoe sizes & set primary shoe size
   */
  static async addSelectedShoeSize(
    userDetails: IJwtPayload,
    payload: { label: string; size: number }[]
  ) {
    const { profileId } = userDetails;

    if (!payload || payload.length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "At least one shoe size is required.");
    }

    const primarySize = payload[0]?.size;

    const buyer = await BuyerModel.findByIdAndUpdate(
      profileId,
      {
        $set: { shoeSize: primarySize },
        $push: { selectedShoeSize: { $each: payload } },
      },
      { new: true }
    );

    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found.");
    }

    return buyer.selectedShoeSize;
  }

  /**
   * Add favorite brands of interest
   */
  static async addBrandsOfInterest(userDetails: IJwtPayload, payload: string[]) {
    const { profileId } = userDetails;

    const buyer = await BuyerModel.findByIdAndUpdate(
      profileId,
      { $addToSet: { brands: { $each: payload } } },
      { new: true }
    );

    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found.");
    }

    return buyer.brands;
  }

  /**
   * Update buyer profile with Cloudinary / S3 avatar upload (500MB max limit)
   */
  static async updateBuyerProfile(
    userDetails: IJwtPayload,
    file: Express.Multer.File | undefined,
    payload: any
  ) {
    const { profileId, authId } = userDetails;

    const buyer = await BuyerModel.findById(profileId);
    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer not found.");
    }

    const updateData: any = {};
    if (payload.name) updateData.name = payload.name;
    if (payload.phone) updateData.phone = payload.phone;
    if (payload.bio) updateData.bio = payload.bio;
    if (payload.shoeSize) updateData.shoeSize = Number(payload.shoeSize);
    if (payload.address) updateData.address = payload.address;
    if (payload.discoveryRadius) updateData.discoveryRadius = Number(payload.discoveryRadius);

    if (payload.longitude !== undefined && payload.latitude !== undefined) {
      updateData.location = {
        type: "Point",
        coordinates: [Number(payload.longitude), Number(payload.latitude)],
      };
    }

    if (file) {
      if (buyer.image) {
        await deleteFromCloud(buyer.image).catch(() => {});
      }
      const media = await uploadToCloud(file, "avatars");
      updateData.image = media.url;
    }

    const updatedBuyer = await BuyerModel.findByIdAndUpdate(
      profileId,
      { $set: updateData },
      { new: true }
    );

    if (payload.name && authId) {
      await AuthModel.findByIdAndUpdate(authId, { $set: { name: payload.name } });
    }

    return updatedBuyer;
  }

  /**
   * Complete Buyer Onboarding Profile
   */
  static async completeBuyerProfile(
    userDetails?: IJwtPayload,
    email?: string,
    payload?: any
  ) {
    let buyerProfile: any;
    let authRecord: any;

    if (userDetails && userDetails.profileId) {
      buyerProfile = await BuyerModel.findById(userDetails.profileId);
      if (userDetails.authId) {
        authRecord = await AuthModel.findById(userDetails.authId);
      }
    } else if (email) {
      buyerProfile = await BuyerModel.findOne({ email: email.toLowerCase() });
      authRecord = await AuthModel.findOne({ email: email.toLowerCase() });
    }

    if (!buyerProfile) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found.");
    }

    if (!authRecord) {
      authRecord = await AuthModel.findOne({ email: buyerProfile.email.toLowerCase() });
    }

    if (!authRecord) {
      throw new AppError(StatusCodes.NOT_FOUND, "Auth user not found.");
    }

    const {
      latitude,
      longitude,
      shoosize,
      type,
      nearbystores,
      notficationprefernce,
      barnads,
    } = payload || {};

    buyerProfile.location = {
      type: "Point",
      coordinates: [Number(longitude || 0), Number(latitude || 0)],
    };
    if (shoosize) {
      buyerProfile.shoeSize = Number(shoosize);
      buyerProfile.selectedShoeSize = [{ label: shoosize.toString(), size: Number(shoosize) }];
    }
    buyerProfile.type = type || "";
    buyerProfile.brands = barnads || [];
    buyerProfile.notification = notficationprefernce || buyerProfile.notification;
    buyerProfile.isProfileCompleted = true;

    await buyerProfile.save();

    if (nearbystores && Array.isArray(nearbystores)) {
      for (const storeId of nearbystores) {
        if (mongoose.Types.ObjectId.isValid(storeId)) {
          await FollowModel.findOneAndUpdate(
            { buyerId: buyerProfile._id, retailerId: storeId },
            { buyerId: buyerProfile._id, retailerId: storeId },
            { upsert: true, new: true }
          );
        }
      }
    }

    authRecord.isProfileCompleted = true;
    await authRecord.save();

    return { isProfileCompleted: true };
  }

  /**
   * Get buyer profile with wallet balance and preferences
   */
  static async getBuyerProfile(userDetails: IJwtPayload) {
    const { profileId } = userDetails;

    const buyer = await BuyerModel.findById(profileId).lean();
    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found.");
    }

    return buyer;
  }
}
