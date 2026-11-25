import { model, Schema, models } from "mongoose";
import { IStoreDailyAnalytics } from "./Analytics.interface";

const StoreDailyAnalyticsSchema = new Schema<IStoreDailyAnalytics>(
  {
    retailerId: { type: Schema.Types.ObjectId, required: true, ref: "Retailer" },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    date: { type: Date, required: true },
    profileViews: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One counter document per store/product per day; also serves the range queries
StoreDailyAnalyticsSchema.index({ retailerId: 1, date: 1, productId: 1 }, { unique: true });

const StoreDailyAnalyticsModel =
  models.StoreDailyAnalytics ||
  model<IStoreDailyAnalytics>("StoreDailyAnalytics", StoreDailyAnalyticsSchema);

export default StoreDailyAnalyticsModel;
