import { Types, Document } from "mongoose";

export interface IVisibilityControls {
  isProfilePublic: boolean;
  showListings: boolean;
  showPrices: boolean;
  approximateLocation: boolean;
  onlineStatus: boolean;
}

export interface IReseller extends Document {
  auth: Types.ObjectId;
  badge: string;
  name: string;
  storeName?: string;
  email: string;
  image: string;
  profileImage?: string;
  coverImage?: string;
  bio: string;
  type: string;
  location: {
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
  address: string;
  phone: string;
  website: string;
  operationHour: Record<string, unknown>;
  socialLink: Record<string, unknown>;
  subscription?: Types.ObjectId;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  isApproved: boolean;
  trustScore: number;
  responseRatePercent: number;
  completedDealsCount: number;
  volumeSoldAmount: number;
  rating: number;
  totalRatings: number;
  visibilityControls: IVisibilityControls;
  createdAt: Date;
  updatedAt: Date;
}
