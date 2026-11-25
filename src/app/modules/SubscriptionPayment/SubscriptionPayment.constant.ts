/**
 * Store plans sold to retailers.
 * SUBSCRIPTION: recurring store membership (renewed by buying again; time stacks).
 * BOOST: paid visibility boost — boosted stores rank first in nearby store discovery.
 */
export const STORE_PLAN_TYPE = {
  SUBSCRIPTION: "SUBSCRIPTION",
  BOOST: "BOOST",
} as const;

export const STORE_PLAN_PURCHASE_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
} as const;

// Stripe Checkout metadata discriminator shared with the order-payment webhook
export const STORE_PLAN_PAYMENT_TYPE = "STORE_PLAN";

export const STORE_PLAN_LIMITS = {
  minPrice: 0.5, // Stripe minimum charge in USD
  maxPrice: 100000,
  minDurationDays: 1,
  maxDurationDays: 3650,
};

export const STORE_PLAN_SEARCHABLE_FIELDS = ["title", "description"];
