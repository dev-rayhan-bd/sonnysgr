import { Types } from "mongoose";

export interface ITrustedReseller {
  retailerId: Types.ObjectId;
  resellerId: Types.ObjectId;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISourcingRequest {
  retailerId: Types.ObjectId;
  resellerId: Types.ObjectId;
  pairId: Types.ObjectId;
  variant: {
    gender: "Men" | "Women" | "Kids";
    size: string;
    quantity: number;
  };
  status: "Pending" | "Accepted" | "Rejected";
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
