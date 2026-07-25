import { Types } from "mongoose";

export interface IOperationHour {
    day: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
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
  socialLink: {};
  subscription: Types.ObjectId;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  followersCount: number;
  averageRating: number;
  isApproved: boolean;
  createdAT: Date;
}