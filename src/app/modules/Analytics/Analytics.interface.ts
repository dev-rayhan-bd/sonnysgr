import { Types } from "mongoose";

/**
 * Daily view counters per store (productId = null) and per product.
 * One document per (retailerId, productId, day) — incremented atomically with upserts.
 */
export interface IStoreDailyAnalytics {
  retailerId: Types.ObjectId;
  productId: Types.ObjectId | null;
  date: Date; // UTC midnight of the day being counted
  profileViews: number;
  productViews: number;
}

export type TAnalyticsRange = "7d" | "30d" | "90d" | "12m";
export type TAnalyticsGranularity = "day" | "month";

export interface IAnalyticsWindow {
  range: TAnalyticsRange;
  granularity: TAnalyticsGranularity;
  start: Date;
  end: Date;
  previousStart: Date; // start of the equally long window before `start`
}
