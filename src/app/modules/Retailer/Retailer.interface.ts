import { Types } from "mongoose";

export interface IOperationHour {
    day: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
}

// Store operation settings (prep time, hold duration, pickup window, service radius)
export interface IStoreSettings {
  prepTimeMinutes: number;
  holdDurationHours: number;
  pickupWindowHours: number;
  serviceRadiusMiles: number;
}

// Active store boost (visibility boost purchased from a BOOST plan)
export interface IStoreBoost {
  planId: Types.ObjectId | null;
  startDate: Date | null;
  endDate: Date | null;
}

// Retailer Interface
export interface IRetailer {
  id: Types.ObjectId;
  auth: Types.ObjectId;
  parentStore?: Types.ObjectId;
  badge: string;
  name: string;
  email: string;
  coverImage: string;
  image: string;
  license: string;
  shoeSize: number;
  type: string;
  details: string;
  location: {
    type: string;
    coordinates: number[];
  };
  address: string;
  phone: string;
  website: string;
  operationHour: IOperationHour[];
  settings?: {
    isAcceptInAppOrder: boolean;
    isAcceptInHoldWithDeposit: boolean;
    isInStorePickupAvailable: boolean;
    customPickupRule: string;
  };
  storeSettings?: IStoreSettings;
  boost?: IStoreBoost;
  socialLink: {};
  subscription: Types.ObjectId;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  followersCount: number;
  averageRating: number;
  isApproved: boolean;
  approvalStatus?: "Pending" | "Under Review" | "More Info Requested" | "Approved" | "Rejected";
  approvalNote?: string;
  approvalUpdatedAt?: Date | null;
  createdAT: Date;
}