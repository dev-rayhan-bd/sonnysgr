import mongoose from "mongoose";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import BuyerModel from "../Buyer.model";
import { FollowModel, WishListModel } from "../../Engagement/Engagement.model";
import { ProductModel } from "../../Product/Product.model";

/**
 * Sub-Service dedicated to Buyer Engagement Feeds: Wishlist, Followed Stores & Brands
 * Optimized with native MongoDB Aggregation & $lookup (Zero .populate())
 */
export class BuyerEngagementSubService {
  /**
   * Get buyer's brand interests, followed stores, and favorited pairs
   * Uses native $lookup joins instead of multiple sequential .populate() trips
   */
  static async getBuyersInterestsData(userDetails: IJwtPayload) {
    const { profileId } = userDetails;
    const buyerObjectId = new mongoose.Types.ObjectId(profileId);

    const [buyer, followedStores, favorites] = await Promise.all([
      BuyerModel.findById(buyerObjectId).select("name shoeSize brands").lean(),
      FollowModel.aggregate([
        { $match: { buyerId: buyerObjectId } },
        {
          $lookup: {
            from: "retailers",
            localField: "retailerId",
            foreignField: "_id",
            as: "store",
          },
        },
        { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            storeId: "$store._id",
            name: "$store.name",
            image: "$store.image",
            address: "$store.address",
            averageRating: "$store.averageRating",
          },
        },
      ]),
      WishListModel.aggregate([
        { $match: { buyerId: buyerObjectId } },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            productId: "$product._id",
            name: "$product.name",
            brand: "$product.brand",
            price: "$product.price",
            image: { $arrayElemAt: ["$product.images", 0] },
          },
        },
      ]),
    ]);

    return {
      brands: (buyer as any)?.brands || [],
      stores: followedStores || [],
      favorites: favorites || [],
    };
  }

  /**
   * Get latest sneakers matching customer's followed brands
   */
  static async getBuyerFollowedBrandsProducts(userDetails: IJwtPayload) {
    const { profileId } = userDetails;
    const buyerObjectId = new mongoose.Types.ObjectId(profileId);

    const buyer = (await BuyerModel.findById(buyerObjectId).select("brands").lean()) as any;
    const brands = buyer?.brands || [];

    if (!brands.length) {
      return [];
    }

    const products = await ProductModel.find({
      brand: { $in: brands },
      availability: { $in: ["Active", "Coming Soon"] },
    })
      .select("name brand price images availability variant styleCode sneakerAttributes")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return products;
  }
}

