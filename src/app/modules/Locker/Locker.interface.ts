import { Types } from "mongoose";

export type TLockerCondition =
  | "Brand New / Deadstock"
  | "Like New (9.5/10)"
  | "VNDS (9/10)"
  | "Good (8/10)"
  | "Used / Worn";

export type TLockerBoxCondition =
  | "Original Box (Good)"
  | "Original Box (Damaged)"
  | "Replacement Box"
  | "No Box";

export type TLockerStatus =
  | "IN_LOCKER"
  | "OFFER_PENDING"
  | "DEAL_ACCEPTED"
  | "SOLD_TO_STORE";

export interface ILockerItem {
  _id?: Types.ObjectId;
  buyerId: Types.ObjectId;
  name: string;
  brand: string;
  styleCode?: string;
  colorway?: string;
  size: string;
  condition: TLockerCondition;
  boxCondition: TLockerBoxCondition;
  accessories?: string[];
  askingPrice: number;
  images: string[];
  description?: string;
  isPublic: boolean;
  isAvailableForTradeIn: boolean;
  status: TLockerStatus;
  location: {
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
  city?: string;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

