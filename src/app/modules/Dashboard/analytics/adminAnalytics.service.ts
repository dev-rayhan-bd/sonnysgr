import { OrderItemModel, OrderModel } from "../../Order/Order.model";
import OfferModel from "../../Offer/Offer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import {
  GMV_ORDER_MATCH,
  SOLD_ITEM_STATUSES,
  dateRangeMatch,
  lookupOne,
  topLimit,
} from "../dashboard.shared";
import getDashboardStats from "./adminStats.service";

type TQuery = Record<string, unknown>;

/** GMV + platform commission over time (orders paid + completed C2B/B2B deals, Module 19.3). */
const getGmv = async (query: TQuery) => {
  const interval = query.interval === "day" ? "day" : "month";
  const format = interval === "day" ? "%Y-%m-%d" : "%Y-%m";

  const [orderSeries, dealSeries] = await Promise.all([
    OrderModel.aggregate([
      { $match: { ...GMV_ORDER_MATCH, ...dateRangeMatch(query) } },
      {
        $group: {
          _id: { $dateToString: { format, date: "$createdAt" } },
          orderGmv: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
    ]),
    // Deals are realised when completed, so bucket them by completion (updatedAt)
    OfferModel.aggregate([
      { $match: { status: "Completed", ...dateRangeMatch(query, "updatedAt") } },
      {
        $group: {
          _id: { $dateToString: { format, date: "$updatedAt" } },
          dealVolume: { $sum: "$currentOfferAmount" },
          deals: { $sum: 1 },
          platformFee: { $sum: "$platformFeeAmount" },
        },
      },
    ]),
  ]);

  const periods = new Map<string, Record<string, number | string>>();
  const blank = (period: string): Record<string, number | string> => ({ period, orderGmv: 0, orders: 0, dealVolume: 0, deals: 0, platformFee: 0 });
  [...orderSeries, ...dealSeries].forEach((row: any) => {
    const entry = periods.get(row._id) || blank(row._id);
    Object.entries(row).forEach(([k, v]) => {
      if (k !== "_id") entry[k] = v as number;
    });
    periods.set(row._id, entry);
  });

  const series = [...periods.values()]
    .map((p: any) => ({ ...p, totalGmv: p.orderGmv + p.dealVolume }))
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));

  const totals = series.reduce(
    (acc, p: any) => ({
      orderGmv: acc.orderGmv + p.orderGmv,
      dealVolume: acc.dealVolume + p.dealVolume,
      totalGmv: acc.totalGmv + p.totalGmv,
      platformCommission: acc.platformCommission + p.platformFee,
      orders: acc.orders + p.orders,
      deals: acc.deals + p.deals,
    }),
    { orderGmv: 0, dealVolume: 0, totalGmv: 0, platformCommission: 0, orders: 0, deals: 0 },
  );

  return { interval, totals, series };
};

/** Platform 5% fee summary split by deal type (C2B locker vs B2B reseller). */
const getCommission = async (query: TQuery) => {
  const rows = await OfferModel.aggregate([
    { $match: { status: "Completed", ...dateRangeMatch(query, "updatedAt") } },
    {
      $group: {
        _id: "$offerType",
        deals: { $sum: 1 },
        dealVolume: { $sum: "$currentOfferAmount" },
        platformCommission: { $sum: "$platformFeeAmount" },
        sellerPayouts: { $sum: "$netSellerPayout" },
      },
    },
    { $project: { _id: 0, offerType: "$_id", deals: 1, dealVolume: 1, platformCommission: 1, sellerPayouts: 1 } },
  ]);

  const totalCommission = rows.reduce((s: number, r: any) => s + r.platformCommission, 0);
  return { totalCommission, byType: rows };
};

/** Top cities by paid orders (shipping/pickup address city). */
const getTopCities = async (query: TQuery) =>
  OrderModel.aggregate([
    { $match: { ...GMV_ORDER_MATCH, ...dateRangeMatch(query) } },
    {
      $group: {
        _id: { $trim: { input: { $ifNull: ["$shippingAddress.city", "Unknown"] } } },
        orders: { $sum: 1 },
        gmv: { $sum: "$totalAmount" },
        buyers: { $addToSet: "$buyerId" },
      },
    },
    { $project: { _id: 0, city: "$_id", orders: 1, gmv: 1, uniqueBuyers: { $size: "$buyers" } } },
    { $sort: { orders: -1, gmv: -1 } },
    { $limit: topLimit(query) },
  ]);

const soldItemsMatch = (query: TQuery) => ({ status: { $in: SOLD_ITEM_STATUSES }, ...dateRangeMatch(query) });

/** Top brands by realised revenue. */
const getTopBrands = async (query: TQuery) =>
  OrderItemModel.aggregate([
    { $match: soldItemsMatch(query) },
    {
      $group: {
        _id: "$productSnapshot.brand",
        revenue: { $sum: "$totalPrice" },
        unitsSold: { $sum: "$quantity" },
        orders: { $addToSet: "$orderId" },
      },
    },
    { $project: { _id: 0, brand: "$_id", revenue: 1, unitsSold: 1, orders: { $size: "$orders" } } },
    { $sort: { revenue: -1 } },
    { $limit: topLimit(query) },
  ]);

/** Top stores by realised revenue. */
const getTopStores = async (query: TQuery) =>
  OrderItemModel.aggregate([
    { $match: soldItemsMatch(query) },
    {
      $group: {
        _id: "$retailerId",
        revenue: { $sum: "$totalPrice" },
        unitsSold: { $sum: "$quantity" },
        orders: { $addToSet: "$orderId" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: topLimit(query) },
    ...lookupOne(RetailerModel.collection.name, "_id", "store", {
      name: 1,
      image: 1,
      address: 1,
      averageRating: 1,
      followersCount: 1,
    }),
    { $project: { _id: 0, retailerId: "$_id", store: 1, revenue: 1, unitsSold: 1, orders: { $size: "$orders" } } },
  ]);

/** Top resellers by completed B2B deal volume. */
const getTopResellers = async (query: TQuery) =>
  OfferModel.aggregate([
    { $match: { offerType: "B2B_RESELLER", status: "Completed", ...dateRangeMatch(query, "updatedAt") } },
    {
      $group: {
        _id: "$sellerId",
        deals: { $sum: 1 },
        dealVolume: { $sum: "$currentOfferAmount" },
        platformCommission: { $sum: "$platformFeeAmount" },
      },
    },
    { $sort: { dealVolume: -1 } },
    { $limit: topLimit(query) },
    ...lookupOne(ResellerModel.collection.name, "_id", "reseller", {
      name: 1,
      storeName: 1,
      image: 1,
      trustScore: 1,
      rating: 1,
    }),
    { $project: { _id: 0, resellerId: "$_id", reseller: 1, deals: 1, dealVolume: 1, platformCommission: 1 } },
  ]);

const AdminAnalyticsService = {
  getDashboardStats,
  getGmv,
  getCommission,
  getTopCities,
  getTopBrands,
  getTopStores,
  getTopResellers,
};

export default AdminAnalyticsService;
