import { Schema, model, models } from "mongoose";
import { IReview, IReviewReply } from "./ReviewManagement.interface";

const ReviewSchema = new Schema<IReview>(
  {
    reviewerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "reviewerType",
    },
    reviewerType: {
      type: String,
      required: true,
      enum: ["Buyer", "Retailer"],
    },
    reviewedId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "reviewedType",
      index: true,
    },
    reviewedType: {
      type: String,
      required: true,
      enum: ["Retailer", "Reseller"],
    },
    reviewType: {
      type: String,
      required: true,
      enum: ["BuyerToRetailer", "RetailerToReseller"],
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    customerServiceRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    authenticityRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    pickupSpeedRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    pricingRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    storeExperienceRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    isVerifiedBuyer: {
      type: Boolean,
      default: false,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    reply: {
      type: Schema.Types.ObjectId,
      ref: "StoreReviewReply",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ reviewedId: 1, reviewType: 1, createdAt: -1 });
ReviewSchema.index({ reviewerId: 1, reviewedId: 1, reviewType: 1 }, { unique: true });

const ReviewReplySchema = new Schema<IReviewReply>(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: "StoreReview",
    },
    replierId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "replierType",
    },
    replierType: {
      type: String,
      required: true,
      enum: ["Retailer", "Reseller"],
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ReviewModel = models.StoreReview || model<IReview>("StoreReview", ReviewSchema);
export const ReviewReplyModel = models.StoreReviewReply || model<IReviewReply>("StoreReviewReply", ReviewReplySchema);
