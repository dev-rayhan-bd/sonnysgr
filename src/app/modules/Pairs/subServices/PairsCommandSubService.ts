import mongoose, { Types } from "mongoose";
import { PairsModel } from "../Pairs.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { deleteFromCloud, uploadMultipleToCloud } from "../../../../helper/cloudStorage";
import { IPairs } from "../Pairs.interface";

/**
 * multipart/form-data sends booleans as strings, and Boolean("false") === true.
 * Accepts real booleans or "true"/"false"/"1"/"0" (case-insensitive).
 */
const parseFormBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1"].includes(value.trim().toLowerCase());
  return false;
};

/** multipart fields carry JSON as strings; arrays/objects may already be parsed */
const parseFormJson = <T>(value: unknown): T | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
};

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
      (sum, v) => sum + Math.max(0, Number(v.stock ?? v.quantity ?? 0) || 0),
      0
    );

    // 3. Condition and visibility controls
    const condition = payload.condition || "Deadstock";
    const isVisibleToStore = payload.isVisibleToStore !== undefined ? parseFormBoolean(payload.isVisibleToStore) : true;
    const isShowAskingPrice = payload.isShowAskingPrice !== undefined ? parseFormBoolean(payload.isShowAskingPrice) : true;
    const isAllowDirectRequest = payload.isAllowDirectRequest !== undefined ? parseFormBoolean(payload.isAllowDirectRequest) : true;

    // condition / color belong to sneakerAttributes (top-level values were silently dropped)
    const parsedAttributes = parseFormJson<Record<string, unknown>>(payload.sneakerAttributes);
    const sneakerAttributes = {
      ...(typeof parsedAttributes === "object" && parsedAttributes ? parsedAttributes : {}),
      ...(payload.condition ? { condition } : {}),
      ...(payload.color ? { color: String(payload.color).trim() } : {}),
    };

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
   * Edit a pair listing (multipart/form-data).
   * - `condition` / `color` are stored in `sneakerAttributes` (top-level or nested input accepted).
   * - Images: `existingImages` = URLs to keep; new `pair-image` files are added after them.
   *   Without `existingImages`, uploading files REPLACES the gallery; without files nothing changes.
   * - Variant stock may be 0; quantity is the real sum of stock.
   */
  static async editPairs(
    user: IJwtPayload,
    pairId: string,
    files: Express.Multer.File[] | undefined,
    payload: Record<string, any>
  ) {
    if (!Types.ObjectId.isValid(pairId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid pair id.");
    }
    const pair = await PairsModel.findOne({
      _id: new Types.ObjectId(pairId),
      resellerId: new Types.ObjectId(user.profileId),
    }).lean<IPairs & { _id: Types.ObjectId }>();
    if (!pair) {
      throw new AppError(StatusCodes.NOT_FOUND, "Pair listing not found or unauthorized");
    }

    const set: Record<string, unknown> = {};
    for (const key of ["name", "brand", "styleCode", "type", "details", "description", "productStatus"]) {
      if (typeof payload[key] === "string" && payload[key].trim() !== "") set[key] = payload[key].trim();
    }
    if (payload.description === "") set.description = "";
    if (payload.askingPrice !== undefined && payload.askingPrice !== "") {
      const price = Number(payload.askingPrice);
      if (!Number.isFinite(price) || price < 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Asking price must be a positive number.");
      }
      set.askingPrice = price;
    }
    for (const key of ["isVisibleToStore", "isShowAskingPrice", "isAllowDirectRequest"]) {
      if (payload[key] !== undefined && payload[key] !== "") set[key] = parseFormBoolean(payload[key]);
    }

    // condition / color live in sneakerAttributes (they were silently dropped at top level)
    const nested = parseFormJson<Record<string, unknown>>(payload.sneakerAttributes) || {};
    const condition = payload.condition ?? nested.condition;
    const color = payload.color ?? nested.color;
    if (condition !== undefined && condition !== "") set["sneakerAttributes.condition"] = condition;
    if (color !== undefined) set["sneakerAttributes.color"] = String(color).trim();

    if (payload.variant !== undefined && payload.variant !== "") {
      const variants = parseFormJson<any[]>(payload.variant);
      if (!Array.isArray(variants) || variants.length === 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "variant must be a non-empty JSON array.");
      }
      set.variant = variants.map((v) => ({
        gender: v.gender,
        size: String(v.size),
        stock: Math.max(0, Math.floor(Number(v.stock ?? v.quantity ?? 0)) || 0),
      }));
      set.quantity = (set.variant as { stock: number }[]).reduce((sum, v) => sum + v.stock, 0);
    }

    // Images
    const current: string[] = pair.images || [];
    const keepInput = payload.existingImages !== undefined ? parseFormJson<string[] | string>(payload.existingImages) : undefined;
    const keepList = keepInput === undefined ? undefined : Array.isArray(keepInput) ? keepInput : [keepInput];
    const hasNewFiles = !!files && files.length > 0;
    let removedImages: string[] = [];

    if (keepList !== undefined || hasNewFiles) {
      const kept = keepList === undefined ? [] : current.filter((url) => keepList.includes(url));
      if (kept.length + (files?.length || 0) > 8) {
        throw new AppError(StatusCodes.BAD_REQUEST, "A pair can have at most 8 images.");
      }
      if (kept.length + (files?.length || 0) === 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "A pair needs at least one image.");
      }
      const uploaded = hasNewFiles ? (await uploadMultipleToCloud(files!, "gosnkr/pairs")).map((img) => img.url) : [];
      set.images = [...kept, ...uploaded];
      removedImages = current.filter((url) => !kept.includes(url));
    }

    if (Object.keys(set).length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Nothing to update.");
    }

    const updatedPair = await PairsModel.findOneAndUpdate(
      { _id: pair._id, resellerId: pair.resellerId },
      { $set: set },
      { new: true, runValidators: true }
    );

    // Old files are removed only after the DB points at the new gallery (best effort)
    for (const url of removedImages) {
      deleteFromCloud(url).catch((err) => console.warn("[PAIRS] could not delete old image:", (err as Error).message));
    }

    return updatedPair;
  }
}
