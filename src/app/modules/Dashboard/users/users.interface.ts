import { Types } from "mongoose";

export interface IUpdateUserStatusPayload {
  status: "Active" | "Warning" | "Banned" | "Deactivated" | "Suspended";
  reason?: string;
}

export interface IAdjustTrustScorePayload {
  trustScore: number;
}
