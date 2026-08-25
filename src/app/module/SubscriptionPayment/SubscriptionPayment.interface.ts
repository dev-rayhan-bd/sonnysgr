import { Types } from "mongoose";

export interface ISubscriptionPlan {
  title: string;
  price: number;
  features: string[];
  duration: string;
  createdAt: Date;
}

export interface ISubscriptionPayment {
  user: Types.ObjectId;
  couple: Types.ObjectId;
  subscription?: {
    id: Types.ObjectId;
    planName: string;
    planPrice: number;
    startDate: Date;
    expireDate: Date;
  };
  paymentId?: string;
  createdAt: Date;
}
