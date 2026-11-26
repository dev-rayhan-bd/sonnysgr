import { ENUM_ORDER_ITEM_STATUS, ENUM_PAYMENT_STATUS } from "../../../utilities/enum";
import { IAnalyticsWindow, TAnalyticsRange } from "./Analytics.interface";

export const ANALYTICS_RANGES: TAnalyticsRange[] = ["7d", "30d", "90d", "12m"];
export const DEFAULT_ANALYTICS_RANGE: TAnalyticsRange = "30d";

// Items that never became a sale (or are still an unconverted hold) are not revenue
export const NON_REVENUE_ITEM_STATUSES = [
  ENUM_ORDER_ITEM_STATUS.CANCELLED,
  ENUM_ORDER_ITEM_STATUS.REJECTED,
  ENUM_ORDER_ITEM_STATUS.HOLDING,
  ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT,
  "Refunded",
];

export const PAID_ORDER_STATUSES = [ENUM_PAYMENT_STATUS.PAID, ENUM_PAYMENT_STATUS.PARTIALLY_PAID];

const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfUtcDay = (date: Date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/**
 * Resolve ?range into a concrete window plus the previous window of equal length
 * (used for period-over-period comparisons).
 */
export const resolveAnalyticsWindow = (range?: string): IAnalyticsWindow => {
  const safeRange = (ANALYTICS_RANGES as string[]).includes(range || "")
    ? (range as TAnalyticsRange)
    : DEFAULT_ANALYTICS_RANGE;

  const end = new Date();
  const todayStart = startOfUtcDay(end);

  if (safeRange === "12m") {
    const start = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth() - 11, 1));
    const previousStart = new Date(Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth(), 1));
    return { range: safeRange, granularity: "month", start, end, previousStart };
  }

  const days = Number(safeRange.replace("d", ""));
  const start = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
  const previousStart = new Date(start.getTime() - days * DAY_MS);
  return { range: safeRange, granularity: "day", start, end, previousStart };
};

export const percentChange = (current: number, previous: number) => {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};
