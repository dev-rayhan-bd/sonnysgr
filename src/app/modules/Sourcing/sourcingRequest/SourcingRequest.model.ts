import { Schema, models, model } from "mongoose";
import { ISourcingRequest, ISourcingResponse } from "./SourcingRequest.interface";

const sourcingResponseSchema = new Schema<ISourcingResponse>(
  {
    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    storeLogo: {
      type: String,
      default: "",
    },
    quotedPrice: {
      type: Number,
      required: true,
    },
    inStockNow: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: "",
    },
    matchedProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const sourcingRequestSchema = new Schema<ISourcingRequest>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    modelName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    colorway: {
      type: String,
      trim: true,
      default: "",
    },
    size: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    maxBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["OPEN", "RESPONDED", "FULFILLED", "CANCELLED", "EXPIRED"],
      default: "OPEN",
      index: true,
    },
    responses: {
      type: [sourcingResponseSchema],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Geospatial index for nearby store discovery
sourcingRequestSchema.index({ location: "2dsphere" });
sourcingRequestSchema.index({ status: 1, brand: 1, size: 1, createdAt: -1 });

export const SourcingRequestModel =
  models.SourcingRequest || model<ISourcingRequest>("SourcingRequest", sourcingRequestSchema);

