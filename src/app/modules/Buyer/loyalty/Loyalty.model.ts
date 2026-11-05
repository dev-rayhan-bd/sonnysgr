import { model, Schema, models } from "mongoose";
import { IVipPointsLog, IReferralReward } from "./Loyalty.interface";

const VipPointsLogSchema = new Schema<IVipPointsLog>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      enum: [
        "PURCHASE",
        "REVIEW",
        "DAILY_LOGIN",
        "REFERRAL_BONUS",
        "PROMOTION",
        "RETURN_PENALTY",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    referenceModel: {
      type: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

VipPointsLogSchema.index({ buyerId: 1, createdAt: -1 });

const ReferralRewardSchema = new Schema<IReferralReward>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    refereeId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      unique: true, // Each referee can only have one active referral reward lifecycle
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
    },
    rewardAmount: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ["PENDING_FIRST_PURCHASE", "REWARDED", "CANCELLED"],
      default: "PENDING_FIRST_PURCHASE",
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    rewardedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

ReferralRewardSchema.index({ referrerId: 1, status: 1 });

export const VipPointsLogModel =
  models.VipPointsLog || model<IVipPointsLog>("VipPointsLog", VipPointsLogSchema);

export const ReferralRewardModel =
  models.ReferralReward || model<IReferralReward>("ReferralReward", ReferralRewardSchema);
