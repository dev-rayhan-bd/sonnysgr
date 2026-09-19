import { Types } from "mongoose";
import ApiError from "../../../../error/ApiError";
import { WishListModel } from "../../Engagement/Engagement.model";
import DemandServices from "../../Demand/Demand.service";
import { ProductModel } from "../../Product/Product.model";
import RetailerModel from "../../Retailer/Retailer.model";

const addToWishlistService = async (
  buyerId: string,
  payload: { productId: string }
) => {
  // Validate ID structures
  if (!Types.ObjectId.isValid(payload.productId)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  // Check if product exists in database
  const product = (await ProductModel.findById(payload.productId).lean()) as any;
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Extract retailerId from the product document
  const retailerId = product.retailerId;
  if (!retailerId) {
    throw new ApiError(400, "Product does not have an associated retailer");
  }

  // Check if retailer exists in database
  const retailer = (await RetailerModel.findById(retailerId).lean()) as any;
  if (!retailer) {
    throw new ApiError(404, "Retailer associated with product not found");
  }

  // Check if the product is already in the buyer's wishlist
  const existing = await WishListModel.findOne({
    buyerId: new Types.ObjectId(buyerId),
    productId: new Types.ObjectId(payload.productId),
  });

  if (existing) {
    throw new ApiError(400, "Product is already in your wishlist");
  }

  const result = await WishListModel.create({
    buyerId: new Types.ObjectId(buyerId),
    productId: new Types.ObjectId(payload.productId),
    retailerId: new Types.ObjectId(retailerId),
  });

  // Log as a wishlist demand event asynchronously
  DemandServices.logDemandEventAsync({
    buyerId,
    productId: payload.productId,
    retailerId: retailerId.toString(),
    eventType: "wishlist",
  });

  return result;
};

const removeFromWishlistService = async (buyerId: string, productId: string) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const result = await WishListModel.findOneAndDelete({
    buyerId: new Types.ObjectId(buyerId),
    productId: new Types.ObjectId(productId),
  });

  if (!result) {
    throw new ApiError(404, "Wishlist item not found");
  }

  return {
    message: "Product removed from wishlist successfully",
  };
};

const getWishlistService = async (buyerId: string) => {
  const wishlist = await WishListModel.find({
    buyerId: new Types.ObjectId(buyerId),
  })
    .populate({
      path: "productId",
      select: "name price images brand availability styleCode price",
    })
    .populate({
      path: "retailerId",
      select: "name email location address",
    })
    .lean();

  return wishlist;
};

export const WishlistServices = {
  addToWishlistService,
  removeFromWishlistService,
  getWishlistService,
};
export default WishlistServices;
