/** What a Stripe Checkout session pays for. Sent as `metadata.paymentType`. */
export const ORDER_PAYMENT_TYPE = {
  ORDER: "ORDER",
  HOLD_DEPOSIT: "HOLD_DEPOSIT",
} as const;

export type TOrderPaymentType = (typeof ORDER_PAYMENT_TYPE)[keyof typeof ORDER_PAYMENT_TYPE];

/** Lifecycle of one OrderPayment record. */
export const ORDER_PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED",
} as const;

export type TOrderPaymentStatus = (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];

/** Statuses where money was captured and part of it may still be refunded. */
export const CAPTURED_PAYMENT_STATUSES: TOrderPaymentStatus[] = [
  ORDER_PAYMENT_STATUS.SUCCESS,
  ORDER_PAYMENT_STATUS.PARTIALLY_REFUNDED,
];

export const REFUND_STATUS = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
} as const;

export type TRefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const REFUND_REASON = {
  BUYER_CANCELLED: "BUYER_CANCELLED",
  STORE_CANCELLED: "STORE_CANCELLED",
  LATE_PAYMENT: "LATE_PAYMENT",
  AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
  DISPUTE_RESOLUTION: "DISPUTE_RESOLUTION",
} as const;

/** A refund is given up (status FAILED, needs an admin) after this many Stripe attempts. */
export const MAX_REFUND_ATTEMPTS = 5;

/**
 * Stock stays reserved this long. Stripe rejects `expires_at` < 30 min after session creation
 * (measured on Stripe's clock), so one extra minute absorbs latency and clock skew.
 */
export const CHECKOUT_SESSION_TTL_MINUTES = 31;

/** The reconciliation job only touches sessions this long past their expiry (gives the webhook time). */
export const RECONCILE_GRACE_MINUTES = 5;

/** Stripe rejects card charges below $0.50. */
export const STRIPE_MIN_CHARGE_USD = 0.5;

/** Flat shipping/service charge the existing checkout already applied to every order. */
export const ORDER_SHIPPING_CHARGE = 13.95;

/**
 * Module 9 deposit rules (REQUIREMENTS 9.1, 9.5).
 * - Deposit = min(flat cap, percent of the hold total), never below Stripe's minimum.
 * - A buyer may choose to pay more (up to the full price), never less.
 * - No-show (hold expires) forfeits the deposit; a store cancellation always refunds it.
 * - `refundOnBuyerCancel`: whether a buyer who cancels before expiry gets the deposit back.
 */
export const HOLD_DEPOSIT_RULES = {
  flatCapUsd: 30,
  percentOfTotal: 0.2,
  refundOnBuyerCancel: true,
} as const;

/** Client-supplied Idempotency-Key records live this long. */
export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** USD dollars -> Stripe cents. */
export const toCents = (amount: number) => Math.round(amount * 100);

/** Round money to 2 decimals to avoid float drift in sums. */
export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;
