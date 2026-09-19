import { model, Schema, models } from "mongoose";
import { IAnalytics, IAnalyticsReseller } from "./Analytics.interface";

const AnalyticsSchema = new Schema<IAnalytics>({
    retailerId: { type: Schema.Types.ObjectId, required: true, ref: "Retailer" },
    profileViewCount: { type: Number, default: 1 },
    productViewCount: { type: Number, default: 1 }
}, { timestamps: true });

const AnalyticsSchemaReseller = new Schema<IAnalyticsReseller>({
    resellerId: { type: Schema.Types.ObjectId, required: true, ref: "Reseller" },
    profileViewCount: { type: Number, default: 1 },
    pairViewCount: { type: Number, default: 1 }
}, { timestamps: true });

const AnalyticsModel = models.Analytics || model<IAnalytics>("Analytics", AnalyticsSchema);

export default AnalyticsModel;