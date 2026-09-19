import { Types } from "mongoose";

export interface IOperationHour {
  day: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface IBranch {
  parentRetailerId: Types.ObjectId;
  profileImage?: string;
  coverImage?: string;
  name: string;
  phone: string;
  address: string;
  location: {
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
  operationHours?: IOperationHour[];
  pickupRules?: string;
  branchSettings?: {
    acceptInAppOrders: boolean;
    acceptHoldWithDeposit: boolean;
    inStorePickupAvailable: boolean;
  };
  inventoryType: "SHARED" | "SEPARATE";
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}
