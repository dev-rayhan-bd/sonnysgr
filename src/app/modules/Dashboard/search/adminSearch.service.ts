import { Model } from "mongoose";
import QueryBuilder from "../../../builder/QueryBuilder";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import { ProductModel } from "../../Product/Product.model";
import { OrderModel } from "../../Order/Order.model";

/** Top-N matches from one collection via the standard QueryBuilder search. */
const searchIn = (model: Model<any>, fields: string[], select: string, term: string, limit: number) =>
  new QueryBuilder(model.find().select(select), { searchTerm: term, limit, page: 1 })
    .search(fields)
    .sort()
    .paginate()
    .modelQuery.lean();

/**
 * Admin header search — one request, grouped results per entity, `limit` (default 5) each.
 * Each group links to its detail screen via `_id` (or `orderNumber` for orders).
 */
const globalSearch = async (query: Record<string, unknown>) => {
  const term = String(query.searchTerm || "").trim();
  const limit = Math.min(Math.max(Number(query.limit) || 5, 1), 20);

  const [buyers, stores, resellers, products, orders] = await Promise.all([
    searchIn(BuyerModel, ["name", "email", "phone"], "name email phone image", term, limit),
    searchIn(RetailerModel, ["name", "email", "address"], "name email address image isApproved approvalStatus", term, limit),
    searchIn(ResellerModel, ["name", "storeName", "email"], "name storeName email image isApproved", term, limit),
    searchIn(ProductModel, ["name", "brand"], "name brand price images retailerId", term, limit),
    searchIn(OrderModel, ["orderNumber", "shippingAddress.name"], "orderNumber orderStatus totalAmount createdAt", term, limit),
  ]);

  return { searchTerm: term, buyers, stores, resellers, products, orders };
};

const AdminSearchService = { globalSearch };

export default AdminSearchService;
