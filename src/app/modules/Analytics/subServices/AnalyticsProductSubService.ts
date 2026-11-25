import mongoose, { PipelineStage } from "mongoose";
import AggregationBuilder from "../../../builder/AggregationBuilder";
import { ProductModel } from "../../Product/Product.model";
import StoreDailyAnalyticsModel from "../Analytics.model";
import { IAnalyticsWindow } from "../Analytics.interface";
import {
  NON_REVENUE_ITEM_STATUSES,
  PAID_ORDER_STATUSES,
  percentChange,
} from "../Analytics.constant";

const TOP_PRODUCT_SORTS = ["-views", "-unitsSold", "-revenue", "-turnoverRate"];

/**
 * Sub-Service dedicated to view metrics and product performance (Module 18.2):
 * store/product views, top viewed / best selling items and inventory turnover.
 */
export class AnalyticsProductSubService {
  static async getViewSummary(retailerId: string, window: IAnalyticsWindow) {
    const dateFormat = window.granularity === "month" ? "%Y-%m" : "%Y-%m-%d";
    const sumViews = {
      $group: {
        _id: null,
        profileViews: { $sum: "$profileViews" },
        productViews: { $sum: "$productViews" },
      },
    };

    const [result] = await StoreDailyAnalyticsModel.aggregate([
      {
        $match: {
          retailerId: new mongoose.Types.ObjectId(retailerId),
          date: { $gte: window.previousStart, $lte: window.end },
        },
      },
      {
        $facet: {
          current: [{ $match: { date: { $gte: window.start } } }, sumViews],
          previous: [{ $match: { date: { $lt: window.start } } }, sumViews],
          trend: [
            { $match: { date: { $gte: window.start } } },
            {
              $group: {
                _id: { $dateToString: { format: dateFormat, date: "$date", timezone: "UTC" } },
                profileViews: { $sum: "$profileViews" },
                productViews: { $sum: "$productViews" },
              },
            },
            { $project: { _id: 0, period: "$_id", profileViews: 1, productViews: 1 } },
            { $sort: { period: 1 } },
          ],
        },
      },
    ]);

    const current = result?.current?.[0] || { profileViews: 0, productViews: 0 };
    const previous = result?.previous?.[0] || { profileViews: 0, productViews: 0 };

    return {
      profileViews: current.profileViews,
      productViews: current.productViews,
      profileViewsChangePercent: percentChange(current.profileViews, previous.profileViews),
      productViewsChangePercent: percentChange(current.productViews, previous.productViews),
      trend: result?.trend || [],
    };
  }

  /**
   * Paginated product performance list for the store.
   * ?sort=-views (default) | -unitsSold | -revenue | -turnoverRate, ?searchTerm, ?page, ?limit
   * turnoverRate = units sold in window / units currently in stock.
   */
  static async getTopProducts(
    retailerId: string,
    window: IAnalyticsWindow,
    query: Record<string, unknown>
  ) {
    const retailerObjectId = new mongoose.Types.ObjectId(retailerId);
    const sort = TOP_PRODUCT_SORTS.includes(String(query.sort)) ? String(query.sort) : "-views";

    const lookupStages: PipelineStage[] = [
      {
        $lookup: {
          from: StoreDailyAnalyticsModel.collection.name,
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                retailerId: retailerObjectId,
                date: { $gte: window.start, $lte: window.end },
                $expr: { $eq: ["$productId", "$$productId"] },
              },
            },
            { $group: { _id: null, views: { $sum: "$productViews" } } },
          ],
          as: "viewStats",
        },
      },
      {
        $lookup: {
          from: "orderitems",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                retailerId: retailerObjectId,
                createdAt: { $gte: window.start, $lte: window.end },
                status: { $nin: NON_REVENUE_ITEM_STATUSES },
                $expr: { $eq: ["$productId", "$$productId"] },
              },
            },
            {
              $lookup: {
                from: "orders",
                let: { orderId: "$orderId" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$orderId"] } } },
                  { $project: { paymentStatus: 1 } },
                ],
                as: "order",
              },
            },
            { $match: { "order.paymentStatus": { $in: PAID_ORDER_STATUSES } } },
            {
              $group: {
                _id: null,
                unitsSold: { $sum: "$quantity" },
                revenue: { $sum: "$totalPrice" },
              },
            },
          ],
          as: "salesStats",
        },
      },
      {
        $addFields: {
          views: { $ifNull: [{ $first: "$viewStats.views" }, 0] },
          unitsSold: { $ifNull: [{ $first: "$salesStats.unitsSold" }, 0] },
          revenue: { $round: [{ $ifNull: [{ $first: "$salesStats.revenue" }, 0] }, 2] },
          stockOnHand: { $sum: "$variant.stock" },
        },
      },
      {
        $addFields: {
          turnoverRate: {
            $round: [{ $divide: ["$unitsSold", { $max: ["$stockOnHand", 1] }] }, 2],
          },
          viewToSaleRate: {
            $cond: [
              { $gt: ["$views", 0] },
              { $round: [{ $multiply: [{ $divide: ["$unitsSold", "$views"] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
    ];

    return await new AggregationBuilder(ProductModel, { ...query, sort: `${sort},-createdAt` }, {
      retailerId: retailerObjectId,
    })
      .search(["name", "brand", "styleCode"])
      .addStages(...lookupStages)
      .sort()
      .execute([
        {
          $project: {
            name: 1,
            brand: 1,
            styleCode: 1,
            price: 1,
            image: { $first: "$images" },
            views: 1,
            unitsSold: 1,
            revenue: 1,
            stockOnHand: 1,
            turnoverRate: 1,
            viewToSaleRate: 1,
          },
        },
      ]);
  }
}
