import mongoose, { Types } from "mongoose";
import ResellerModel from "../Reseller.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { uploadMultipleToCloud } from "../../../../helper/cloudStorage";
import { IVisibilityControls } from "../Reseller.interface";

export class ResellerProfileSubService {
  /**
   * Fetch Reseller's own profile
   */
  static async getMyProfile(user: IJwtPayload) {
    const resellerObjectId = new Types.ObjectId(user.profileId);
    const reseller = await ResellerModel.findById(resellerObjectId).lean();
    if (!reseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller profile not found");
    }
    return reseller;
  }

  /**
   * Fetch public Reseller profile (respects visibilityControls)
   */
  static async getPublicResellerProfile(resellerId: string) {
    const resellerObjectId = new Types.ObjectId(resellerId);
    const reseller = (await ResellerModel.findById(resellerObjectId).lean()) as any;
    if (!reseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller not found");
    }

    if (reseller.visibilityControls && !reseller.visibilityControls.isProfilePublic) {
      throw new AppError(StatusCodes.FORBIDDEN, "This trader profile is set to private");
    }

    // Strip sensitive exact address if approximate location is requested
    if (reseller.visibilityControls?.approximateLocation && reseller.address) {
      const parts = reseller.address.split(",");
      reseller.address = parts.length > 1 ? parts.slice(-2).join(",").trim() : "Local Area";
    }

    return reseller;
  }

  /**
   * Update Reseller Profile Details & Multi-Cloud Avatar/Cover
   */
  static async updateProfile(
    user: IJwtPayload,
    files: { profileImage?: Express.Multer.File[]; coverImage?: Express.Multer.File[] } | undefined,
    payload: {
      name?: string;
      storeName?: string;
      bio?: string;
      phone?: string;
      website?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      socialLink?: Record<string, string>;
      operationHour?: Record<string, string>;
    }
  ) {
    const resellerObjectId = new Types.ObjectId(user.profileId);
    const updateData: any = {};

    if (payload.name) updateData.name = payload.name;
    if (payload.storeName) updateData.storeName = payload.storeName;
    if (payload.bio !== undefined) updateData.bio = payload.bio;
    if (payload.phone) updateData.phone = payload.phone;
    if (payload.website !== undefined) updateData.website = payload.website;
    if (payload.address) updateData.address = payload.address;
    if (payload.socialLink) updateData.socialLink = payload.socialLink;
    if (payload.operationHour) updateData.operationHour = payload.operationHour;

    if (payload.latitude !== undefined && payload.longitude !== undefined) {
      updateData.location = {
        type: "Point",
        coordinates: [Number(payload.longitude), Number(payload.latitude)],
      };
    }

    // Multi-Cloud Image Uploads (Cloudinary default / S3 auto-switch)
    if (files?.profileImage && files.profileImage.length > 0) {
      const [uploaded] = await uploadMultipleToCloud(files.profileImage, "gosnkr/resellers/profile");
      if (uploaded) {
        updateData.image = uploaded.url;
        updateData.profileImage = uploaded.url;
      }
    }

    if (files?.coverImage && files.coverImage.length > 0) {
      const [uploaded] = await uploadMultipleToCloud(files.coverImage, "gosnkr/resellers/cover");
      if (uploaded) {
        updateData.coverImage = uploaded.url;
      }
    }

    const updatedReseller = await ResellerModel.findByIdAndUpdate(
      resellerObjectId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedReseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller profile not found");
    }

    return updatedReseller;
  }

  /**
   * Update granular privacy & visibility toggles (Module 1.10)
   */
  static async updateVisibilityControls(
    user: IJwtPayload,
    controls: Partial<IVisibilityControls>
  ) {
    const resellerObjectId = new Types.ObjectId(user.profileId);
    const updateQuery: any = {};

    for (const [key, value] of Object.entries(controls)) {
      if (value !== undefined) {
        updateQuery[`visibilityControls.${key}`] = Boolean(value);
      }
    }

    const updatedReseller = await ResellerModel.findByIdAndUpdate(
      resellerObjectId,
      { $set: updateQuery },
      { new: true }
    );

    if (!updatedReseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller profile not found");
    }

    return updatedReseller.visibilityControls;
  }
}
