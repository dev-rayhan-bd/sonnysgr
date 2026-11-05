import { model, Schema, models } from "mongoose";
import { IReseller } from "./Reseller.interface";

const ResellerSchema = new Schema<IReseller>(
  {
    auth: { type: Schema.Types.ObjectId, required: true, ref: "Auth", index: true },
    badge: { type: String, default: "Trusted Seller" },
    name: { type: String, required: true, trim: true },
    storeName: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    bio: { type: String, default: "" },
    type: { type: String, default: "Reseller" },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    operationHour: { type: Object, default: {} },
    socialLink: { type: Object, default: {} },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    isApproved: { type: Boolean, default: true },
    trustScore: { type: Number, default: 98, min: 0, max: 100 },
    responseRatePercent: { type: Number, default: 96, min: 0, max: 100 },
    completedDealsCount: { type: Number, default: 0, min: 0 },
    volumeSoldAmount: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0, min: 0 },
    visibilityControls: {
      isProfilePublic: { type: Boolean, default: true },
      showListings: { type: Boolean, default: true },
      showPrices: { type: Boolean, default: true },
      approximateLocation: { type: Boolean, default: false },
      onlineStatus: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Indexes
ResellerSchema.index({ location: "2dsphere" });
ResellerSchema.index({ isApproved: 1, trustScore: -1 });

const ResellerModel = models.Reseller || model<IReseller>("Reseller", ResellerSchema);

export default ResellerModel;
