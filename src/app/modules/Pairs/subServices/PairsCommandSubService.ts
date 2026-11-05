import mongoose, { Types } from "mongoose";
import { PairsModel } from "../Pairs.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { uploadMultipleToCloud } from "../../../../helper/cloudStorage";
import { IPairs } from "../Pairs.interface";

export class PairsCommandSubService {
  /**
   * Reseller lists a new deadstock / consignment pair with multi-cloud media
   */
  static async addNewPairs(
    user: IJwtPayload,
    files: Express.Multer.File[],
    payload: any
  ) {
    const resellerObjectId = new Types.ObjectId(user.profileId);

    if (!files || files.length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "At least one image is required for listing a pair");
    }

    // 1. Upload to Cloudinary / AWS S3 Auto-Switch (500MB max)
    const uploadedImages = await uploadMultipleToCloud(files, "gosnkr/pairs");
    const imageUrls = uploadedImages.map((img) => img.url);

    // 2. Parse variants safely
    let parsedVariants: any[] = [];
    if (typeof payload.variant === "string") {
      try {
        parsedVariants = JSON.parse(payload.variant);
      } catch (err) {
        parsedVariants = [];
      }
    } else if (Array.isArray(payload.variant)) {
      parsedVariants = payload.variant;
    }

    // Calculate total quantity from variant matrix
    const totalStock = parsedVariants.reduce(
      (sum, v) => sum + (Number(v.stock) || Number(v.quantity) || 1),
      0
    );

    // 3. Condition and visibility controls
    const condition = payload.condition || "Deadstock";
    const isVisibleToStore = payload.isVisibleToStore !== undefined ? Boolean(payload.isVisibleToStore) : true;
    const isShowAskingPrice = payload.isShowAskingPrice !== undefined ? Boolean(payload.isShowAskingPrice) : true;
    const isAllowDirectRequest = payload.isAllowDirectRequest !== undefined ? Boolean(payload.isAllowDirectRequest) : true;

    let sneakerAttributes = payload.sneakerAttributes;
    if (typeof sneakerAttributes === "string") {
      try {
        sneakerAttributes = JSON.parse(sneakerAttributes);
      } catch (e) {
        sneakerAttributes = {};
      }
    }

    const newPair = await PairsModel.create({
      resellerId: resellerObjectId,
      name: payload.name,
      brand: payload.brand,
      styleCode: payload.styleCode || payload.sku || "",
      type: payload.type || "Shoes",
      details: payload.details || "",
      color: payload.color || "",
      images: imageUrls,
      variant: parsedVariants,
      askingPrice: Number(payload.askingPrice) || 0,
      condition,
      isVisibleToStore,
      isShowAskingPrice,
      isAllowDirectRequest,
      isSold: false,
      pairViewCount: 0,
      quantity: totalStock || Number(payload.quantity) || 1,
      description: payload.description || "",
      productStatus: "active",
      sneakerAttributes,
    });

    return newPair;
  }

  /**
   * Edit pair details and update images / variant matrix
   */
  static async editPairs(
    user: IJwtPayload,
    pairId: string,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    const resellerObjectId = new Types.ObjectId(user.profileId);
    const pairObjectId = new Types.ObjectId(pairId);

    const pair = await PairsModel.findOne({
      _id: pairObjectId,
      resellerId: resellerObjectId,
    });

    if (!pair) {
      throw new AppError(StatusCodes.NOT_FOUND, "Pair listing not found or unauthorized");
    }

    const updateFields: any = {};

    if (payload.name) updateFields.name = payload.name;
    if (payload.brand) updateFields.brand = payload.brand;
    if (payload.styleCode) updateFields.styleCode = payload.styleCode;
    if (payload.type) updateFields.type = payload.type;
    if (payload.details) updateFields.details = payload.details;
    if (payload.color) updateFields.color = payload.color;
    if (payload.askingPrice !== undefined) updateFields.askingPrice = Number(payload.askingPrice);
    if (payload.condition) updateFields.condition = payload.condition;
    if (payload.description !== undefined) updateFields.description = payload.description;
    if (payload.productStatus) updateFields.productStatus = payload.productStatus;
    if (payload.isVisibleToStore !== undefined) updateFields.isVisibleToStore = Boolean(payload.isVisibleToStore);
    if (payload.isShowAskingPrice !== undefined) updateFields.isShowAskingPrice = Boolean(payload.isShowAskingPrice);
    if (payload.isAllowDirectRequest !== undefined) updateFields.isAllowDirectRequest = Boolean(payload.isAllowDirectRequest);

    // Multi-Cloud Image Uploads if new files provided
    if (files && files.length > 0) {
      const uploadedImages = await uploadMultipleToCloud(files, "gosnkr/pairs");
      const newUrls = uploadedImages.map((img) => img.url);
      updateFields.images = [...(pair.images || []), ...newUrls];
    }

    // Variant parsing
    if (payload.variant) {
      let parsedVariants: any[] = [];
      if (typeof payload.variant === "string") {
        try {
          parsedVariants = JSON.parse(payload.variant);
        } catch (e) {
          parsedVariants = [];
        }
      } else if (Array.isArray(payload.variant)) {
        parsedVariants = payload.variant;
      }
      if (parsedVariants.length > 0) {
        updateFields.variant = parsedVariants;
        updateFields.quantity = parsedVariants.reduce(
          (sum, v) => sum + (Number(v.stock) || Number(v.quantity) || 1),
          0
        );
      }
    }

    const updatedPair = await PairsModel.findByIdAndUpdate(
      pairObjectId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    return updatedPair;
  }
}
