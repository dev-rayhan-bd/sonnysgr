import { PipelineStage, Types } from "mongoose";
import ApiError from "../../../../error/ApiError";
import AggregationBuilder from "../../../builder/AggregationBuilder";
import AuthModel from "../../auth/auth.model";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import { ProductModel } from "../../Product/Product.model";
import { PairsModel } from "../../Pairs/Pairs.model";
import { OrderItemModel, OrderModel } from "../../Order/Order.model";
import OfferModel from "../../Offer/Offer.model";
import { SOLD_ITEM_STATUSES } from "../dashboard.shared";

type TStage = PipelineStage.FacetPipelineStage;

/** Resolve the polymorphic `profile` ref (Buyer | Retailer | Reseller) into one object. */
const profileStages = (): TStage[] => [
  {
    $lookup: {
      from: BuyerModel.collection.name,
      localField: "profile",
      foreignField: "_id",
      as: "_buyer",
      pipeline: [{ $project: { name: 1, image: 1, phone: 1, address: 1 } }],
    },
  },
  {
    $lookup: {
      from: RetailerModel.collection.name,
      localField: "profile",
      foreignField: "_id",
      as: "_retailer",
      pipeline: [
        {
          $project: {
            name: 1,
            image: 1,
            email: 1,
            address: 1,
            isApproved: 1,
            averageRating: 1,
            followersCount: 1,
            approvalNote: 1,
            // Stores created before the review workflow have no approvalStatus yet
            approvalStatus: { $ifNull: ["$approvalStatus", { $cond: ["$isApproved", "Approved", "Pending"] }] },
          },
        },
      ],
    },
  },
  {
    $lookup: {
      from: ResellerModel.collection.name,
      localField: "profile",
      foreignField: "_id",
      as: "_reseller",
      pipeline: [{ $project: { name: 1, storeName: 1, image: 1, isApproved: 1, trustScore: 1 } }],
    },
  },
  {
    $addFields: {
      profile: {
        $ifNull: [
          { $first: "$_buyer" },
          { $first: "$_retailer" },
          { $first: "$_reseller" },
          "$profile",
        ],
      },
    },
  },
  { $unset: ["_buyer", "_retailer", "_reseller"] },
];

const countLookup = (from: string, foreignField: string, as: string, match: Record<string, unknown> = {}): TStage => ({
  $lookup: {
    from,
    localField: "profile._id",
    foreignField,
    as,
    pipeline: [...(Object.keys(match).length ? [{ $match: match }] : []), { $count: "n" }],
  },
});

const countOf = (field: string) => ({ $ifNull: [{ $first: `$${field}.n` }, 0] });

/** Per-row activity counters: buyer orders, store products/revenue, reseller listings/deals. */
const statsStages = (): TStage[] => [
  countLookup(OrderModel.collection.name, "buyerId", "_orders"),
  countLookup(ProductModel.collection.name, "retailerId", "_products"),
  {
    $lookup: {
      from: OrderItemModel.collection.name,
      localField: "profile._id",
      foreignField: "retailerId",
      as: "_sales",
      pipeline: [
        { $match: { status: { $in: SOLD_ITEM_STATUSES } } },
        { $group: { _id: null, revenue: { $sum: "$totalPrice" }, units: { $sum: "$quantity" } } },
      ],
    },
  },
  countLookup(PairsModel.collection.name, "resellerId", "_listings"),
  countLookup(OfferModel.collection.name, "sellerId", "_deals", { status: "Completed" }),
  {
    $addFields: {
      stats: {
        $switch: {
          branches: [
            { case: { $eq: ["$role", "Buyer"] }, then: { orderCount: countOf("_orders") } },
            {
              case: { $eq: ["$role", "Retailer"] },
              then: {
                productCount: countOf("_products"),
                totalRevenue: { $ifNull: [{ $first: "$_sales.revenue" }, 0] },
                unitsSold: { $ifNull: [{ $first: "$_sales.units" }, 0] },
              },
            },
            {
              case: { $eq: ["$role", "Reseller"] },
              then: { listingCount: countOf("_listings"), dealCount: countOf("_deals") },
            },
          ],
          default: {},
        },
      },
    },
  },
  {
    $project: {
      password: 0,
      verificationCode: 0,
      authProviders: 0,
      __v: 0,
      _orders: 0,
      _products: 0,
      _sales: 0,
      _listings: 0,
      _deals: 0,
    },
  },
];

const getAllUsersService = async (query: Record<string, unknown>) => {
  const normalised = { ...query, searchTerm: query.searchTerm || query.searchText };
  const needsProfileFirst = Boolean(normalised.searchTerm || query.approvalStatus);

  const builder = new AggregationBuilder(AuthModel, normalised).filter({ role: "string", status: "string" });

  if (needsProfileFirst) {
    builder.addStages(...(profileStages() as PipelineStage[]));
    builder.search(["email", "profile.name", "profile.storeName"]);
    if (query.approvalStatus) builder.match({ "profile.approvalStatus": String(query.approvalStatus) });
  }

  return builder.sort().execute([...(needsProfileFirst ? [] : profileStages()), ...statsStages()]);
};

const getSingleUserService = async (id: string) => {
  const [user] = await AuthModel.aggregate([
    { $match: { _id: new Types.ObjectId(id) } },
    ...profileStages(),
    ...statsStages(),
  ] as PipelineStage[]);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  return user;
};

const usersQueryServices = { getAllUsersService, getSingleUserService };

export default usersQueryServices;
