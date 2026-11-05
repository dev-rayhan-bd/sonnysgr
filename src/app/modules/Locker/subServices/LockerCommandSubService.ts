import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import LockerModel from "../Locker.model";
import BuyerModel from "../../Buyer/Buyer.model";
import { uploadMultipleToCloud, deleteFromCloud } from "../../../../helper/cloudStorage";

/**
 * Sub-Service dedicated to Locker Item Mutations (Add, Edit, Privacy Toggle, Delete)
 */
export class LockerCommandSubService {
  /**
   * Add a new sneaker to buyer's locker collection with multi-image cloud uploads
   */
  static async addSneakerToLocker(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    const { profileId } = userDetails;
    const buyerObjectId = new mongoose.Types.ObjectId(profileId);

    if (!files || files.length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "At least one sneaker image is required.");
    }

    // 1. Upload sneaker photos (Cloudinary + S3 auto-switch, 500MB limit safe)
    const uploadedMedia = await uploadMultipleToCloud(files, "locker-sneakers");
    const imageUrls = uploadedMedia.map((m) => m.url);

    // 2. Resolve Geo Location for hyper-local store discovery
    let lng = payload.longitude ? Number(payload.longitude) : 0;
    let lat = payload.latitude ? Number(payload.latitude) : 0;

    if (lng === 0 && lat === 0) {
      const buyer = (await BuyerModel.findById(buyerObjectId).lean()) as any;
      if (buyer?.location?.coordinates && buyer.location.coordinates[0] !== 0) {
        lng = buyer.location.coordinates[0];
        lat = buyer.location.coordinates[1];
      }
    }

    let accessories = payload.accessories;
    if (typeof accessories === "string") {
      try {
        accessories = JSON.parse(accessories);
      } catch {
        accessories = accessories.split(",").map((s: string) => s.trim());
      }
    }

    const lockerItem = await LockerModel.create({
      buyerId: buyerObjectId,
      name: payload.name,
      brand: payload.brand,
      styleCode: payload.styleCode || "",
      colorway: payload.colorway || "",
      size: String(payload.size),
      condition: payload.condition,
      boxCondition: payload.boxCondition || "Original Box (Good)",
      accessories: Array.isArray(accessories) ? accessories : [],
      askingPrice: Number(payload.askingPrice),
      images: imageUrls,
      description: payload.description || "",
      isPublic: payload.isPublic === "false" || payload.isPublic === false ? false : true,
      isAvailableForTradeIn:
        payload.isAvailableForTradeIn === "false" || payload.isAvailableForTradeIn === false
          ? false
          : true,
      status: "IN_LOCKER",
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      city: payload.city || "",
    });

    return lockerItem;
  }

  /**
   * Update sneaker item details or add additional photos
   */
  static async updateLockerItem(
    userDetails: IJwtPayload,
    lockerItemId: string,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    const { profileId } = userDetails;

    const item = await LockerModel.findOne({
      _id: lockerItemId,
      buyerId: profileId,
    });

    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Locker sneaker not found or access denied.");
    }

    if (item.status === "DEAL_ACCEPTED" || item.status === "SOLD_TO_STORE") {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot edit item currently in '${item.status}' state.`
      );
    }

    const updateData: any = {};
    if (payload.name) updateData.name = payload.name;
    if (payload.brand) updateData.brand = payload.brand;
    if (payload.styleCode !== undefined) updateData.styleCode = payload.styleCode;
    if (payload.colorway !== undefined) updateData.colorway = payload.colorway;
    if (payload.size) updateData.size = String(payload.size);
    if (payload.condition) updateData.condition = payload.condition;
    if (payload.boxCondition) updateData.boxCondition = payload.boxCondition;
    if (payload.askingPrice) updateData.askingPrice = Number(payload.askingPrice);
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.isPublic !== undefined) {
      updateData.isPublic = payload.isPublic === "true" || payload.isPublic === true;
    }
    if (payload.isAvailableForTradeIn !== undefined) {
      updateData.isAvailableForTradeIn =
        payload.isAvailableForTradeIn === "true" || payload.isAvailableForTradeIn === true;
    }

    if (files && files.length > 0) {
      const uploadedMedia = await uploadMultipleToCloud(files, "locker-sneakers");
      const newUrls = uploadedMedia.map((m) => m.url);
      updateData.images = [...item.images, ...newUrls];
    }

    const updatedItem = await LockerModel.findByIdAndUpdate(
      lockerItemId,
      { $set: updateData },
      { new: true }
    );

    return updatedItem;
  }

  /**
   * Toggle Locker item between Public community showcase and Private
   */
  static async toggleLockerPrivacy(
    userDetails: IJwtPayload,
    lockerItemId: string,
    isPublic: boolean
  ) {
    const { profileId } = userDetails;

    const updatedItem = await LockerModel.findOneAndUpdate(
      { _id: lockerItemId, buyerId: profileId },
      { $set: { isPublic } },
      { new: true }
    );

    if (!updatedItem) {
      throw new AppError(StatusCodes.NOT_FOUND, "Locker item not found.");
    }

    return updatedItem;
  }

  /**
   * Delete sneaker from locker collection
   */
  static async deleteLockerItem(userDetails: IJwtPayload, lockerItemId: string) {
    const { profileId } = userDetails;

    const item = await LockerModel.findOne({
      _id: lockerItemId,
      buyerId: profileId,
    });

    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Locker item not found.");
    }

    if (item.status === "DEAL_ACCEPTED") {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Cannot delete sneaker with an active accepted store deal."
      );
    }

    // Clean up images from cloud
    for (const imgUrl of item.images) {
      await deleteFromCloud(imgUrl);
    }

    await LockerModel.findByIdAndDelete(lockerItemId);
    return { message: "Sneaker removed from locker successfully." };
  }
}

