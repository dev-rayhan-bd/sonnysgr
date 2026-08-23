import { Types } from "mongoose";

export interface IFollow {
  buyerId: Types.ObjectId;      // ref Buyer.id
  retailerId: Types.ObjectId;   // ref Retailer.id
  createdAt: Date;
}

export interface IUserFollow {
  senderId: Types.ObjectId;      // ref Buyer.id
  receiverId: Types.ObjectId;   // ref Retailer.id
  createdAt: Date;
}

export interface IFollowProduct {
  buyerId: Types.ObjectId;      // ref Buyer.id
  productId: Types.ObjectId;    // ref Product.id
  createdAt: Date;
}

export interface IwishList {
  buyerId: Types.ObjectId;      // ref Buyer.id
  retailerId: Types.ObjectId;   // ref Retailer.id
  productId: Types.ObjectId;
  isWanted: boolean;   // ref Product.id
  createdAt: Date;
}

export interface IReview {
  buyerId: Types.ObjectId;      // ref Buyer.id
  retailerId: Types.ObjectId;
  productId: Types.ObjectId; 
  content: string;
  overallrating: number;
  customerServiceRating: number;
  authenticityRating: number;
  pickupSpeedRating: number;
  priceRating: number;
  storeExperienceRating: number;
  staffHelpfulnessRating: number; // ref Product.id
  createdAt: Date;
}