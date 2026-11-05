import { model, Schema } from "mongoose";
import { IOffer, IOfferTimeline } from "./Offer.interface";

const OfferTimelineSchema = new Schema<IOfferTimeline>(
  {
    status: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorRole: { type: String, enum: ["Retailer", "Buyer", "Reseller"], required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OfferSchema = new Schema<IOffer>(
  {
    offerType: {
      type: String,
      enum: ["C2B_LOCKER", "B2B_RESELLER"],
      required: true,
      default: "C2B_LOCKER",
      index: true,
    },
    targetItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    itemSnapshot: {
      name: { type: String, required: true },
      brand: { type: String, required: true },
      size: { type: String, required: true },
      condition: { type: String, required: true },
      itemImage: { type: String, default: "" },
      askingPrice: { type: Number, required: true },
      styleCode: { type: String, default: "" },
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "sellerRole",
      index: true,
    },
    sellerRole: {
      type: String,
      enum: ["Buyer", "Reseller"],
      required: true,
      default: "Buyer",
    },
    buyerStoreId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    storeAddress: {
      type: String,
      default: "",
    },
    askingPrice: {
      type: Number,
      required: true,
    },
    currentOfferAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    platformFeePercent: {
      type: Number,
      default: 5,
    },
    platformFeeAmount: {
      type: Number,
      required: true,
    },
    netSellerPayout: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Countered",
        "Accepted",
        "Declined",
        "Expired",
        "Withdrawn",
        "Completed",
      ],
      default: "Pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
    dropoffVerificationCode: {
      type: String,
      default: "",
      index: true,
    },
    timeline: {
      type: [OfferTimelineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

OfferSchema.index({ sellerId: 1, status: 1 });
OfferSchema.index({ buyerStoreId: 1, status: 1 });
OfferSchema.index({ targetItemId: 1, status: 1 });

export const OfferModel = model<IOffer>("Offer", OfferSchema);
export default OfferModel;

