import { model, Schema, models } from "mongoose";
import { IStorePlan, IStorePlanPurchase } from "./SubscriptionPayment.interface";
import {
  STORE_PLAN_LIMITS,
  STORE_PLAN_PURCHASE_STATUS,
  STORE_PLAN_TYPE,
} from "./SubscriptionPayment.constant";

const StorePlanSchema = new Schema<IStorePlan>(
  {
    planType: {
      type: String,
      enum: Object.values(STORE_PLAN_TYPE),
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: STORE_PLAN_LIMITS.minPrice },
    durationDays: {
      type: Number,
      required: true,
      min: STORE_PLAN_LIMITS.minDurationDays,
      max: STORE_PLAN_LIMITS.maxDurationDays,
    },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const StorePlanPurchaseSchema = new Schema<IStorePlanPurchase>(
  {
    retailerId: { type: Schema.Types.ObjectId, ref: "Retailer", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "StorePlan", required: true },
    planType: { type: String, enum: Object.values(STORE_PLAN_TYPE), required: true, index: true },
    planSnapshot: {
      title: { type: String, required: true },
      price: { type: Number, required: true },
      durationDays: { type: Number, required: true },
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    transactionId: { type: String, required: true, unique: true },
    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String },
    status: {
      type: String,
      enum: Object.values(STORE_PLAN_PURCHASE_STATUS),
      default: STORE_PLAN_PURCHASE_STATUS.PENDING,
      index: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

StorePlanPurchaseSchema.index({ retailerId: 1, createdAt: -1 });

export const StorePlanModel = models.StorePlan || model<IStorePlan>("StorePlan", StorePlanSchema);
export const StorePlanPurchaseModel =
  models.StorePlanPurchase ||
  model<IStorePlanPurchase>("StorePlanPurchase", StorePlanPurchaseSchema);

export default StorePlanModel;
