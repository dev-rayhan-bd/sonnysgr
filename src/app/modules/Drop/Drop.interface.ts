import { Types } from "mongoose";

export interface IDrop {
  retailerId: Types.ObjectId;
  dropImages: string[];
  name: string;
  brand: string;
  category: string;
  realeaseDate: Date;
  time: string;
  timezone: string;
  vipEalryAccess: boolean;
  earlyMinustes: number;
  raffledrop: boolean;
  maximumEntries: number;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  stockAvailablity: {
    availablePairs: number;
    estimatedDemand: string;
    staus: "upcomming" | "live" | "closed";
  };
}
