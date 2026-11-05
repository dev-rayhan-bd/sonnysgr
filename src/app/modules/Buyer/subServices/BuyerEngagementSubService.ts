import mongoose from "mongoose";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import BuyerModel from "../Buyer.model";
import { FollowModel, WishListModel } from "../../Engagement/Engagement.model";
import { ProductModel } from "../../Product/Product.model";
import RetailerModel from "../../Retailer/Retailer.model";
import QueryBuilder from "../../../builder/QueryBuilder";
import { ENUM_PRODUCT_AVAILABILITY } from "../../../../utilities/enum";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";

/**
 * Sub-Service dedicated to Buyer Engagement Feeds:
 * Wishlist, Followed Stores, Brands, Retailers & Nearby Products
 * Strictly using Native MongoDB Aggregation Pipelines (Zero Mongoose .populate())
 */
export class BuyerEngagementSubService {
  /**
   * Get buyer's brand interests, followed stores, and favorited pairs
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
   * Get buyer brand interests, followed stores, and wishlist items with aggregation
   */
  static async getBuyersStoreBrandWishlistdataService(userDetails: IJwtPayload) {
    return await this.getBuyersInterestsData(userDetails);
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
      return { followedBrandProduct: [] };
    }

    const products = await ProductModel.find({
      brand: { $in: brands },
      availability: { $in: [ENUM_PRODUCT_AVAILABILITY.ACTIVE, ENUM_PRODUCT_AVAILABILITY.LOW_STOCK] },
    })
      .select("name brand price images availability variant styleCode sneakerAttributes")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return { followedBrandProduct: products };
  }

  /**
   * Get latest sneakers from stores the buyer follows
   */
  static async getBuyerFollowedRetailersProducts(userDetails: IJwtPayload) {
    const { profileId } = userDetails;
    const buyerObjectId = new mongoose.Types.ObjectId(profileId);

    const followedRetailers = await FollowModel.find({ buyerId: buyerObjectId })
      .select("retailerId")
      .lean();

    const retailerIds = followedRetailers.map((item: any) => item.retailerId);

    if (!retailerIds.length) {
      return { followedRetailerProduct: [] };
    }

    const products = await ProductModel.find({
      retailerId: { $in: retailerIds },
      availability: { $in: [ENUM_PRODUCT_AVAILABILITY.ACTIVE, ENUM_PRODUCT_AVAILABILITY.LOW_STOCK] },
    })
      .select("name brand price images availability variant styleCode sneakerAttributes retailerId")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return { followedRetailerProduct: products };
  }

  /**
   * Retrieve all retailers with pagination and search, marking isFollowing flag
   */
  static async getAllRetailersByBuyer(userDetails: IJwtPayload, query: Record<string, any>) {
    const { profileId } = userDetails;

    const retailerQueryObj = RetailerModel.find({ isApproved: true });
    const queryBuilder = new QueryBuilder(retailerQueryObj, query)
      .search(["name", "email", "address", "phone"])
      .filter()
      .sort()
      .paginate();

    const retailers = await queryBuilder.modelQuery.lean();
    const meta = await queryBuilder.countTotal();

    const follows = await FollowModel.find({ buyerId: profileId }).select("retailerId").lean();
    const followedRetailerIds = new Set(follows.map((f: any) => f.retailerId.toString()));

    const data = retailers.map((retailer: any) => ({
      ...retailer,
      isFollowing: followedRetailerIds.has(retailer._id.toString()),
    }));

    return { meta, data };
  }

  /**
   * Retrieve single retailer details with isFollowing status
   */
  static async getSingleRetailerByBuyer(userDetails: IJwtPayload, retailerId: string) {
    const { profileId } = userDetails;

    if (!mongoose.Types.ObjectId.isValid(retailerId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid retailer ID format.");
    }

    const retailer = await RetailerModel.findById(retailerId).lean();
    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer not found.");
    }

    const follow = await FollowModel.findOne({ buyerId: profileId, retailerId }).lean();

    return {
      ...retailer,
      isFollowing: !!follow,
    };
  }

  /**
   * Hyper-local nearby products discovery feed with geo aggregation
   */
  static async getNearbyProductsForBuyer(userDetails: IJwtPayload, query: Record<string, any>) {
    const { profileId } = userDetails;
    let lng = Number(query.longitude || query.lng);
    let lat = Number(query.latitude || query.lat);

    if (!lng || !lat) {
      const buyer = (await BuyerModel.findById(profileId).select("location").lean()) as any;
      if (buyer?.location?.coordinates && buyer.location.coordinates[0] !== 0) {
        lng = buyer.location.coordinates[0];
        lat = buyer.location.coordinates[1];
      }
    }

    const productType = query.productType || "all";
    const maxDistance = Number(query.maxDistance) || 50000; // default 50km

    const matchStage: any = {
      availability: { $in: [ENUM_PRODUCT_AVAILABILITY.ACTIVE, ENUM_PRODUCT_AVAILABILITY.LOW_STOCK] },
    };

    if (productType !== "all") {
      matchStage.type = productType;
    }

    const geoNearStage: any = {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng || 0, lat || 0],
        },
        distanceField: "distance",
        maxDistance,
        spherical: true,
        query: { isApproved: true },
      },
    };

    const nearbyProducts = lng && lat
      ? await RetailerModel.aggregate([
          geoNearStage,
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "retailerId",
              as: "products",
              pipeline: [{ $match: matchStage }],
            },
          },
          { $unwind: "$products" },
          {
            $project: {
              _id: "$products._id",
              retailerId: "$_id",
              retailerName: "$name",
              retailerImage: "$image",
              distanceMiles: { $round: [{ $divide: ["$distance", 1609.34] }, 1] },
              name: "$products.name",
              price: "$products.price",
              images: "$products.images",
              type: "$products.type",
              brand: "$products.brand",
              availability: "$products.availability",
              createdAt: "$products.createdAt",
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 12 },
        ])
      : [];

    return nearbyProducts;
  }
}
