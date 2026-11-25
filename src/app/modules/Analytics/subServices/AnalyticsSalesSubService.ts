import mongoose from "mongoose";
import { OrderItemModel } from "../../Order/Order.model";
import { ENUM_ORDER_ITEM_STATUS } from "../../../../utilities/enum";
import { IAnalyticsWindow } from "../Analytics.interface";
import {
  NON_REVENUE_ITEM_STATUSES,
  PAID_ORDER_STATUSES,
  percentChange,
} from "../Analytics.constant";

interface ISalesTotals {
  grossSales: number;
  completedSales: number;
  unitsSold: number;
  orders: number;
}

const EMPTY_TOTALS: ISalesTotals = { grossSales: 0, completedSales: 0, unitsSold: 0, orders: 0 };

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Sub-Service dedicated to sales & revenue metrics (Module 18.1).
 * A sale = an order item of this store on a paid order that was not cancelled/rejected
 * and is not an unconverted hold.
 */
export class AnalyticsSalesSubService {
  static async getSalesSummary(retailerId: string, window: IAnalyticsWindow) {
    const dateFormat = window.granularity === "month" ? "%Y-%m" : "%Y-%m-%d";

    const totalsStages = [
      {
        $group: {
          _id: null,
          grossSales: { $sum: "$totalPrice" },
          completedSales: {
            $sum: {
              $cond: [{ $eq: ["$status", ENUM_ORDER_ITEM_STATUS.COMPLETED] }, "$totalPrice", 0],
            },
          },
          unitsSold: { $sum: "$quantity" },
          orderIds: { $addToSet: "$orderId" },
        },
      },
      {
        $project: {
          _id: 0,
          grossSales: 1,
          completedSales: 1,
          unitsSold: 1,
          orders: { $size: "$orderIds" },
        },
      },
    ];

    const [result] = await OrderItemModel.aggregate([
      {
        $match: {
          retailerId: new mongoose.Types.ObjectId(retailerId),
          createdAt: { $gte: window.previousStart, $lte: window.end },
          status: { $nin: NON_REVENUE_ITEM_STATUSES },
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
      { $unwind: "$order" },
      { $match: { "order.paymentStatus": { $in: PAID_ORDER_STATUSES } } },
      {
        $facet: {
          current: [{ $match: { createdAt: { $gte: window.start } } }, ...totalsStages],
          previous: [{ $match: { createdAt: { $lt: window.start } } }, ...totalsStages],
          trend: [
            { $match: { createdAt: { $gte: window.start } } },
            {
              $group: {
                _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "UTC" } },
                revenue: { $sum: "$totalPrice" },
                unitsSold: { $sum: "$quantity" },
                orderIds: { $addToSet: "$orderId" },
              },
            },
            {
              $project: {
                _id: 0,
                period: "$_id",
                revenue: { $round: ["$revenue", 2] },
                unitsSold: 1,
                orders: { $size: "$orderIds" },
              },
            },
            { $sort: { period: 1 } },
          ],
        },
      },
    ]);

    const current: ISalesTotals = result?.current?.[0] || EMPTY_TOTALS;
    const previous: ISalesTotals = result?.previous?.[0] || EMPTY_TOTALS;

    return {
      totals: {
        grossSales: round2(current.grossSales),
        completedSales: round2(current.completedSales),
        unitsSold: current.unitsSold,
        orders: current.orders,
        averageOrderValue: current.orders ? round2(current.grossSales / current.orders) : 0,
      },
      comparison: {
        previousGrossSales: round2(previous.grossSales),
        grossSalesChangePercent: percentChange(current.grossSales, previous.grossSales),
        previousOrders: previous.orders,
        ordersChangePercent: percentChange(current.orders, previous.orders),
      },
      trend: AnalyticsSalesSubService.fillTrend(result?.trend || [], window),
    };
  }

  /**
   * Zero-fill missing periods so charts get a continuous series.
   */
  private static fillTrend(
    rows: { period: string; revenue: number; unitsSold: number; orders: number }[],
    window: IAnalyticsWindow
  ) {
    const byPeriod = new Map(rows.map((row) => [row.period, row]));
    const series: { period: string; revenue: number; unitsSold: number; orders: number }[] = [];
    const cursor = new Date(window.start);

    while (cursor <= window.end) {
      const period =
        window.granularity === "month"
          ? cursor.toISOString().slice(0, 7)
          : cursor.toISOString().slice(0, 10);
      series.push(byPeriod.get(period) || { period, revenue: 0, unitsSold: 0, orders: 0 });

      if (window.granularity === "month") {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      } else {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return series;
  }
}
