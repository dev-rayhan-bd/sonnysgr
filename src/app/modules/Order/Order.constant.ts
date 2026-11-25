import { randomInt } from "crypto";
import { ENUM_ORDER_ITEM_STATUS } from "../../../utilities/enum";

export const PICKUP_CODE_PREFIX = "GS-PICKUP-";

/** QR payload for in-store pickup: GS-PICKUP- + a random 6-digit code (REQUIREMENTS 10.2). */
export const generatePickupCode = () => `${PICKUP_CODE_PREFIX}${randomInt(100000, 1000000)}`;

/** Accept the scanned QR value or the 6 digits typed by hand. */
export const normalisePickupCode = (input: string) => {
  const code = String(input || "").trim().toUpperCase();
  return /^\d{6}$/.test(code) ? `${PICKUP_CODE_PREFIX}${code}` : code;
};

/**
 * Legacy status strings written by older code paths before statuses were aligned with
 * ENUM_ORDER_ITEM_STATUS (e.g. "Ready_For_Pickup" instead of "Ready for Pickup").
 * They are only READ for backward compatibility with existing documents — never write them.
 */
const LEGACY_STATUSES = {
  NEEDS_ACTION: ["Pending", "Payment_Completed", "Needs Action"],
  HOLDS: ["Hold", "On Hold", "Held"],
  READY: ["Ready", "Ready_For_Pickup"],
  HISTORY: ["Refunded"],
};

/**
 * Single source of truth: Retailer 4-stage UI tabs -> OrderItem.status values.
 * Used by the retailer order feed, stage counters, fulfillment transitions and financial stats.
 */
export const RETAILER_ORDER_STAGE_STATUSES = {
  NEEDS_ACTION: [ENUM_ORDER_ITEM_STATUS.PLACED, ...LEGACY_STATUSES.NEEDS_ACTION],
  HOLDS: [ENUM_ORDER_ITEM_STATUS.HOLDING, ...LEGACY_STATUSES.HOLDS],
  READY: [
    ENUM_ORDER_ITEM_STATUS.PROCESSING,
    ENUM_ORDER_ITEM_STATUS.READY_FOR_PICKUP,
    ...LEGACY_STATUSES.READY,
  ],
  HISTORY: [
    ENUM_ORDER_ITEM_STATUS.COMPLETED,
    ENUM_ORDER_ITEM_STATUS.DELIVERED,
    ENUM_ORDER_ITEM_STATUS.CANCELLED,
    ...LEGACY_STATUSES.HISTORY,
  ],
};

/** Map a UI tab label ("Needs Action" | "Holds" | "Ready" | "History") to a status filter. */
export const getRetailerStageStatusFilter = (stage: string): Record<string, unknown> => {
  switch (stage) {
    case "Needs Action":
    case "Pending":
      return { status: { $in: RETAILER_ORDER_STAGE_STATUSES.NEEDS_ACTION } };
    case "Holds":
      return { status: { $in: RETAILER_ORDER_STAGE_STATUSES.HOLDS } };
    case "Ready":
      return { status: { $in: RETAILER_ORDER_STAGE_STATUSES.READY } };
    case "History":
      return { status: { $in: RETAILER_ORDER_STAGE_STATUSES.HISTORY } };
    default:
      return { status: stage };
  }
};
