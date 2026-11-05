import { Types, Document } from "mongoose";

export type TVipSource =
  | "PURCHASE"
  | "REVIEW"
  | "DAILY_LOGIN"
  | "REFERRAL_BONUS"
  | "PROMOTION"
  | "RETURN_PENALTY";

export type TVipTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface IVipPointsLog extends Document {
  buyerId: Types.ObjectId;
  points: number; // e.g. +90, +20, +10, -100
  source: TVipSource;
  description: string;
  referenceId?: Types.ObjectId;
  referenceModel?: string;
  createdAt: Date;
}

export type TReferralStatus = "PENDING_FIRST_PURCHASE" | "REWARDED" | "CANCELLED";

export interface IReferralReward extends Document {
  referrerId: Types.ObjectId; // The user who invited
  refereeId: Types.ObjectId; // The invited user
  referralCode: string;
  rewardAmount: number; // $10 GoSNKR credit
  status: TReferralStatus;
  orderId?: Types.ObjectId; // Order qualifying the referral payout
  rewardedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
