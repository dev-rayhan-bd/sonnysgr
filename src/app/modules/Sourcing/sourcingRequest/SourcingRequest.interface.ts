import { Types, Document } from "mongoose";

export type TSourcingRequestStatus = "OPEN" | "RESPONDED" | "FULFILLED" | "CANCELLED" | "EXPIRED";

export interface ISourcingResponse {
  retailerId: Types.ObjectId;
  storeName: string;
  storeLogo?: string;
  quotedPrice: number;
  inStockNow: boolean;
  notes?: string;
  matchedProductId?: Types.ObjectId;
  respondedAt: Date;
}

export interface ISourcingRequest extends Document {
  buyerId: Types.ObjectId;
  brand: string;
  modelName: string;
  colorway?: string;
  size: string;
  maxBudget: number;
  notes?: string;
  images?: string[];
  location: {
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
  status: TSourcingRequestStatus;
  responses: ISourcingResponse[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
