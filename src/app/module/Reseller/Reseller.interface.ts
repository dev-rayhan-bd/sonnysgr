import { Types } from "mongoose";

export interface IReseller {
  id: Types.ObjectId;
  auth: Types.ObjectId;
  badge: string;
  name: string;
  email: string;
  image: string;
  // shoeSize: number;
  bio: string;
  type: string;
  location: {
    type: string;
    coordinates: number[];
  };
  address: string;
  phone: string;
  website: string;
  operationHour: {};
  socialLink: {};
  subscription: Types.ObjectId;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  isApproved: boolean;
  trustScore?: number;
  createdAT: Date;
}