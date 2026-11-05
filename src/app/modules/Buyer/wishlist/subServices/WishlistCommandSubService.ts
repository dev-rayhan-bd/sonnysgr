import mongoose from "mongoose";
import AppError from "../../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { WishListModel } from "../../../Engagement/Engagement.model";
import { ProductModel } from "../../../Product/Product.model";
import DemandServices from "../../../Demand/Demand.service";

/**
 * Sub-Service dedicated to Wishlist & Wanted Grail Mutations (Module 11.1 & 11.2)
 */
export class WishlistCommandSubService {
  /**
   * Add sneaker to wishlist with desired size tagging and push alert preferences
   */
  static async addToWishlist(
    buyerId: string,
    payload: {
      productId: string;
      desiredSize?: string | number;
      notifyOnRestock?: boolean;
      notifyOnPriceDrop?: boolean;
      targetPrice?: number;
    }
  ) {
    const { productId, desiredSize, notifyOnRestock = true, notifyOnPriceDrop = true, targetPrice } = payload;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid product ID format.");
    }

    const product = (await ProductModel.findById(productId).lean()) as any;
    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, "Product not found.");
    }

    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const retailerObjectId = product.retailerId ? new mongoose.Types.ObjectId(product.retailerId) : undefined;

    const sizeKey = desiredSize !== undefined ? String(desiredSize) : null;

    // Check if already in wishlist with this size
    const existing = await WishListModel.findOne({
      buyerId: buyerObjectId,
      productId: productObjectId,
      ...(sizeKey ? { desiredSize: sizeKey } : {}),
    });

    if (existing) {
      existing.notifyOnRestock = notifyOnRestock;
      existing.notifyOnPriceDrop = notifyOnPriceDrop;
      if (targetPrice !== undefined) existing.targetPrice = targetPrice;
      await existing.save();
      return existing;
    }

    const wishlistItem = await WishListModel.create({
      buyerId: buyerObjectId,
      productId: productObjectId,
      retailerId: retailerObjectId,
      isWanted: false,
      desiredSize: sizeKey,
      notifyOnRestock,
      notifyOnPriceDrop,
      targetPrice,
    });

    // Log demand event asynchronously for analytics & store notifications
    DemandServices.logDemandEventAsync({
      buyerId,
      productId,
      retailerId: product.retailerId?.toString() || "",
      eventType: "wishlist",
    });

    return wishlistItem;
  }

  /**
   * Remove item from wishlist
   */
  static async removeFromWishlist(buyerId: string, productId: string, desiredSize?: string | number) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid product ID format.");
    }

    const query: any = {
      buyerId: new mongoose.Types.ObjectId(buyerId),
      productId: new mongoose.Types.ObjectId(productId),
    };

    if (desiredSize !== undefined) {
      query.desiredSize = String(desiredSize);
    }

    const result = await WishListModel.findOneAndDelete(query);
    if (!result) {
      throw new AppError(StatusCodes.NOT_FOUND, "Wishlist item not found.");
    }

    return { message: "Sneaker removed from wishlist successfully." };
  }

  /**
   * Flag or unflag a sneaker as a Wanted Grail (Module 11.2)
   */
  static async toggleWantedGrail(
    buyerId: string,
    payload: { productId: string; isWanted?: boolean; desiredSize?: string | number }
  ) {
    const { productId, isWanted = true, desiredSize } = payload;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid product ID format.");
    }

    const product = (await ProductModel.findById(productId).lean()) as any;
    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, "Product not found.");
    }

    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const sizeKey = desiredSize !== undefined ? String(desiredSize) : null;

    const wishlistItem = await WishListModel.findOneAndUpdate(
      {
        buyerId: buyerObjectId,
        productId: productObjectId,
        ...(sizeKey ? { desiredSize: sizeKey } : {}),
      },
      {
        $set: {
          isWanted,
          desiredSize: sizeKey,
          retailerId: product.retailerId,
          notifyOnRestock: true,
        },
      },
      { upsert: true, new: true }
    );

    // Log grail demand event asynchronously
    if (isWanted) {
      DemandServices.logDemandEventAsync({
        buyerId,
        productId,
        retailerId: product.retailerId?.toString() || "",
        eventType: "wishlist",
      });
    }

    return wishlistItem;
  }
}
