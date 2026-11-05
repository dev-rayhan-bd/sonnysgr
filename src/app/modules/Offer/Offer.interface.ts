import { Types } from "mongoose";

export type TOfferType = "C2B_LOCKER" | "B2B_RESELLER";

export type TOfferStatus =
  | "Pending"
  | "Countered"
  | "Accepted"
  | "Declined"
  | "Expired"
  | "Withdrawn"
  | "Completed";

export interface IOfferTimeline {
  status: string;
  actorId: Types.ObjectId;
  actorRole: "Retailer" | "Buyer" | "Reseller";
  amount: number;
  note?: string;
  timestamp: Date;
}

export interface IItemSnapshot {
  name: string;
  brand: string;
  size: string;
  condition: string;
  itemImage: string;
  askingPrice: number;
  styleCode?: string;
}

export interface IOffer {
  _id?: Types.ObjectId;
  offerType: TOfferType;
  targetItemId: Types.ObjectId; // Ref: Locker or Pairs
  itemSnapshot: IItemSnapshot;
  
  sellerId: Types.ObjectId; // Ref: Buyer or Reseller
  sellerRole: "Buyer" | "Reseller";
  buyerStoreId: Types.ObjectId; // Ref: Retailer
  storeName: string;
  storeAddress?: string;

  askingPrice: number;
  currentOfferAmount: number;

  // Transparent Financials
  platformFeePercent: number; // 5%
  platformFeeAmount: number;
  netSellerPayout: number;

  status: TOfferStatus;
  expiresAt: Date;
  note?: string;
  dropoffVerificationCode?: string; // GS-DROP-XXXXXX generated upon acceptance

  timeline: IOfferTimeline[];

  createdAt: Date;
  updatedAt: Date;
}

