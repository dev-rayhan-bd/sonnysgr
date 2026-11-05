import { Types } from "mongoose";

export interface IReview {
  _id?: Types.ObjectId;
  reviewerId: Types.ObjectId;     // Buyer or Retailer profile ID
  reviewerType: "Buyer" | "Retailer";
  reviewedId: Types.ObjectId;     // Retailer or Reseller profile ID
  reviewedType: "Retailer" | "Reseller";
  reviewType: "BuyerToRetailer" | "RetailerToReseller";
  rating: number;                 // 1 to 5
  content: string;
  customerServiceRating?: number;  // 1 to 5 (Module 12.2)
  authenticityRating?: number;     // 1 to 5 (Module 12.2)
  pickupSpeedRating?: number;      // 1 to 5 (Module 12.2)
  pricingRating?: number;          // 1 to 5 (Module 12.2)
  storeExperienceRating?: number;  // 1 to 5 (Module 12.2)
  isVerifiedBuyer?: boolean;       // Verified Buyer Badge (Module 12.1)
  orderId?: Types.ObjectId | null; // Completed order reference
  reply?: Types.ObjectId | null;   // Reference to ReviewReply
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReviewReply {
  _id?: Types.ObjectId;
  reviewId: Types.ObjectId;       // Reference to Review
  replierId: Types.ObjectId;      // Retailer or Reseller profile ID
  replierType: "Retailer" | "Reseller";
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}
