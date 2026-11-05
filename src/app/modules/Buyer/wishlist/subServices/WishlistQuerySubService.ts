import mongoose from "mongoose";
import { WishListModel } from "../../../Engagement/Engagement.model";
import { ENUM_PRODUCT_AVAILABILITY } from "../../../../../utilities/enum";

/**
 * Sub-Service dedicated to Wishlist & Wanted Grail Queries
 * Strictly uses native MongoDB Aggregation Pipelines (Zero Mongoose .populate())
 */
export class WishlistQuerySubService {
  /**
   * Get buyer's wishlist with live size stock verification and store details
   */
  static async getWishlist(buyerId: string, query: Record<string, unknown> = {}) {
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const isWanted = query.isWanted !== undefined ? query.isWanted === "true" || query.isWanted === true : undefined;

    const matchFilter: any = { buyerId: buyerObjectId };
    if (isWanted !== undefined) {
      matchFilter.isWanted = isWanted;
    }

    const items = await WishListModel.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                brand: 1,
                price: 1,
                images: 1,
                availability: 1,
                variant: 1,
                styleCode: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "retailers",
          localField: "retailerId",
          foreignField: "_id",
          as: "retailer",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                image: 1,
                address: 1,
                phone: 1,
                averageRating: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$retailer", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ]);

    const formattedItems = items.map((item: any) => {
      const product = item.product;
      const desiredSize = item.desiredSize ? String(item.desiredSize) : null;

      let isInStock = false;
      let currentStock = 0;

      if (product && product.variant && Array.isArray(product.variant)) {
        if (desiredSize) {
          const matchingVariant = product.variant.find((v: any) => String(v.size) === desiredSize);
          if (matchingVariant) {
            currentStock = matchingVariant.stock || 0;
            isInStock =
              product.availability === ENUM_PRODUCT_AVAILABILITY.ACTIVE && currentStock > 0;
          }
        } else {
          // If no specific size tagged, check if any variant is in stock
          const inStockVariant = product.variant.find((v: any) => (v.stock || 0) > 0);
          isInStock =
            product.availability === ENUM_PRODUCT_AVAILABILITY.ACTIVE && !!inStockVariant;
          currentStock = inStockVariant?.stock || 0;
        }
      }

      return {
        _id: item._id,
        productId: item.productId,
        productName: product?.name || "Product Unavailable",
        brand: product?.brand || "",
        image: product?.images?.[0] || "",
        currentPrice: product?.price || 0,
        availability: product?.availability || "Out of Stock",
        desiredSize: item.desiredSize,
        isInStock,
        currentStock,
        isWanted: item.isWanted,
        notifyOnRestock: item.notifyOnRestock,
        notifyOnPriceDrop: item.notifyOnPriceDrop,
        targetPrice: item.targetPrice,
        retailer: item.retailer
          ? {
              _id: item.retailer._id,
              name: item.retailer.name,
              image: item.retailer.image,
              address: item.retailer.address,
              averageRating: item.retailer.averageRating || 5.0,
            }
          : undefined,
        createdAt: item.createdAt,
      };
    });

    return formattedItems;
  }

  /**
   * Get customer's flagged Wanted Grails (Module 11.2)
   */
  static async getWantedGrails(buyerId: string) {
    return await this.getWishlist(buyerId, { isWanted: true });
  }
}
