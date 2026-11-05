import { Schema, model, models } from "mongoose";
import { IStoreVisit } from "./StoreVisit.interface";

const StoreVisitSchema = new Schema<IStoreVisit>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    visitType: {
      type: String,
      enum: ["IN_STORE_PICKUP", "C2B_TRADE_IN", "QR_CHECKIN", "IN_STORE_BROWSE"],
      default: "IN_STORE_PICKUP",
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    referenceModel: {
      type: String,
      enum: ["Order", "Offer"],
      default: null,
    },
    verified: {
      type: Boolean,
      default: true,
    },
    visitCount: {
      type: Number,
      default: 1,
    },
    lastVisitedAt: {
      type: Date,
      default: Date.now,
    },
    firstVisitedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

StoreVisitSchema.index({ buyerId: 1, retailerId: 1 });

export const StoreVisitModel =
  models.StoreVisit || model<IStoreVisit>("StoreVisit", StoreVisitSchema);

export default StoreVisitModel;

