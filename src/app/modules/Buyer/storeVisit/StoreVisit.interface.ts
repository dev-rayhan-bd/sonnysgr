import { Types } from "mongoose";

export type TStoreVisitType = "IN_STORE_PICKUP" | "C2B_TRADE_IN" | "QR_CHECKIN" | "IN_STORE_BROWSE";

export interface IStoreVisit {
  _id?: Types.ObjectId;
  buyerId: Types.ObjectId;
  retailerId: Types.ObjectId;
  branchId?: Types.ObjectId;
  visitType: TStoreVisitType;
  referenceId?: Types.ObjectId; // orderId or offerId
  referenceModel?: "Order" | "Offer";
  verified: boolean;
  visitCount: number;
  lastVisitedAt: Date;
  firstVisitedAt: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
