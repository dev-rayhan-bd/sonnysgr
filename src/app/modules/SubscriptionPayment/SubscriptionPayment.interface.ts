import { Types } from "mongoose";
import { STORE_PLAN_PURCHASE_STATUS, STORE_PLAN_TYPE } from "./SubscriptionPayment.constant";

export type TStorePlanType = (typeof STORE_PLAN_TYPE)[keyof typeof STORE_PLAN_TYPE];
export type TStorePlanPurchaseStatus =
  (typeof STORE_PLAN_PURCHASE_STATUS)[keyof typeof STORE_PLAN_PURCHASE_STATUS];

// Admin-managed plan catalog (subscription plans and boost plans)
export interface IStorePlan {
  _id?: Types.ObjectId;
  planType: TStorePlanType;
  title: string;
  description: string;
  price: number; // USD
  durationDays: number;
  features: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// One Stripe Checkout purchase of a plan by a retailer
export interface IStorePlanPurchase {
  _id?: Types.ObjectId;
  retailerId: Types.ObjectId;
  planId: Types.ObjectId;
  planType: TStorePlanType;
  planSnapshot: {
    title: string;
    price: number;
    durationDays: number;
  };
  amount: number;
  currency: string;
  transactionId: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  status: TStorePlanPurchaseStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStorePlanCheckoutPayload {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}
