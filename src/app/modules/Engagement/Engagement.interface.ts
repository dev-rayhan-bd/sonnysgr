import { Types } from "mongoose";

export interface IStoreAlertPreferences {
  newArrivals: boolean;
  exclusiveDrops: boolean;
  flashSales: boolean;
  restocks: boolean;
  isCustomized: boolean;
}

export interface IFollow {
  buyerId: Types.ObjectId;      // ref Buyer.id
  retailerId: Types.ObjectId;   // ref Retailer.id
  alertPreferences?: IStoreAlertPreferences;
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
  _id?: Types.ObjectId;
  buyerId: Types.ObjectId;      // ref Buyer.id
  retailerId?: Types.ObjectId;   // ref Retailer.id
  productId: Types.ObjectId;    // ref Product.id
  isWanted: boolean;            // Flag for Wanted Grails (Module 11.2)
  desiredSize?: string | number;// Desired Size Tagging (Module 11.1)
  notifyOnRestock?: boolean;    // Push alert on local restock
  notifyOnPriceDrop?: boolean;  // Push alert on price drop
  targetPrice?: number;         // Customer target price alert threshold
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
