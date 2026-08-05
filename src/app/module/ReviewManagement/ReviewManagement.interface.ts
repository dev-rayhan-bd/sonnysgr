import { Types } from "mongoose";

export interface IReview {
  reviewerId: Types.ObjectId;     // Buyer or Retailer profile ID
  reviewerType: "Buyer" | "Retailer";
  reviewedId: Types.ObjectId;     // Retailer or Reseller profile ID
  reviewedType: "Retailer" | "Reseller";
  reviewType: "BuyerToRetailer" | "RetailerToReseller";
  rating: number;                 // 1 to 5
  content: string;
  customerServiceRating?: number;  // 1 to 5
  authenticityRating?: number;     // 1 to 5
  pickupSpeedRating?: number;      // 1 to 5
  pricingRating?: number;          // 1 to 5
  storeExperienceRating?: number;  // 1 to 5
  reply?: Types.ObjectId | null;   // Reference to ReviewReply
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReviewReply {
  reviewId: Types.ObjectId;       // Reference to Review
  replierId: Types.ObjectId;      // Retailer or Reseller profile ID
  replierType: "Retailer" | "Reseller";
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}
