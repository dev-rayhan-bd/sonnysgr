import { Types } from "mongoose";

export type TDemandEventType =
  | "search"
  | "view"
  | "size_select"
  | "out_of_stock"
  | "wishlist"
  | "explicit_request";

export interface IDemandEvent {
  buyerId: Types.ObjectId;
  productId: Types.ObjectId;
  retailerId?: Types.ObjectId;
  size?: string;
  eventType: TDemandEventType;
  weight: number;
  location: {
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DEMAND_EVENT_WEIGHTS: Record<TDemandEventType, number> = {
  search: 1,
  view: 2,
  size_select: 3,
  wishlist: 4,
  out_of_stock: 5,
  explicit_request: 6,
};
