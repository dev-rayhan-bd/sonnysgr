import { Types } from "mongoose";
import ApiError from "../../../../error/ApiError";
import { FollowProductModel } from "../../Engagement/Engagement.model";
import { ProductModel } from "../../Product/Product.model";
import QueryBuilder from "../../../builders/QueryBuilder";

const addToFollowingService = async (
  buyerId: string,
  payload: { productId: string }
) => {
  if (!Types.ObjectId.isValid(payload.productId)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  // Check if product exists in database
  const product = await ProductModel.findById(payload.productId).lean();
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if already following the product
  const existing = await FollowProductModel.findOne({
    buyerId: new Types.ObjectId(buyerId),
    productId: new Types.ObjectId(payload.productId),
  });

  if (existing) {
    throw new ApiError(400, "Product is already in your follow list");
  }

  const result = await FollowProductModel.create({
    buyerId: new Types.ObjectId(buyerId),
    productId: new Types.ObjectId(payload.productId),
  });

  return result;
};

const removeFromFollowingService = async (buyerId: string, productId: string) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product ID format");
  }

  const result = await FollowProductModel.findOneAndDelete({
    buyerId: new Types.ObjectId(buyerId),
    productId: new Types.ObjectId(productId),
  });

  if (!result) {
    throw new ApiError(404, "Followed item not found");
  }

  return {
    message: "Product removed from follow list successfully",
  };
};

const getFollowingService = async (buyerId: string, query: Record<string, any>) => {
  const productFilter: any = {};

  const hasBrandFilter = query.brand !== undefined && query.brand !== "";
  if (hasBrandFilter) {
    productFilter.brand = { $regex: new RegExp(query.brand, "i") };
  }

  const hasTypeFilter = query.type !== undefined && query.type !== "";
  if (hasTypeFilter) {
    let productType = query.type;
    if (/shoe/i.test(productType)) {
      productType = "Shoes";
    } else if (/cloth/i.test(productType)) {
      productType = "Clothing";
    }
    productFilter.type = { $regex: new RegExp(productType, "i") };
  }

  // Use QueryBuilder to filter and search on ProductModel
  const productQuery = ProductModel.find(productFilter);
  const productQueryBuilder = new QueryBuilder(productQuery, query)
    .search(["name", "brand", "type"]);

  const matchedProducts = await productQueryBuilder.modelQuery.select("_id").lean();
  const matchedIds = matchedProducts.map((p: any) => p._id);

  // Query FollowProductModel with the matched product IDs
  const followQuery = FollowProductModel.find({
    buyerId: new Types.ObjectId(buyerId),
    productId: { $in: matchedIds },
  });

  const followQueryBuilder = new QueryBuilder(followQuery, query)
    .sort()
    .paginate();

  const followingList = await followQueryBuilder.modelQuery
    .populate({
      path: "productId",
      select: "name price images brand availability styleCode type",
    })
    .lean();

  const meta = await followQueryBuilder.countTotal();

  // Filter out records where the populated product does not exist
  const data = followingList.filter((item: any) => item.productId);

  return {
    meta,
    data,
  };
};

export const FollowingServices = {
  addToFollowingService,
  removeFromFollowingService,
  getFollowingService,
};
export default FollowingServices;
