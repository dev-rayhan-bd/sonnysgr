import mongoose, { Types } from "mongoose";
import BuyerModel from "../Buyer.model";
import { VipPointsLogModel } from "../loyalty/Loyalty.model";
import { TVipSource, TVipTier } from "../loyalty/Loyalty.interface";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { getIO } from "../../../utils/socket";

export class BuyerLoyaltySubService {
  /**
   * Determine Tier and Perks based on accumulated points
   */
  static determineTier(points: number): {
    tier: TVipTier;
    nextTier: TVipTier | null;
    threshold: number;
    pointsToNext: number;
    progressPercentage: number;
    perks: string[];
  } {
    if (points >= 2000) {
      return {
        tier: "Platinum",
        nextTier: null,
        threshold: 2000,
        pointsToNext: 0,
        progressPercentage: 100,
        perks: [
          "Priority in-store pickup line",
          "Exclusive VIP Early Drop Access (30m headstart)",
          "Platinum profile badge",
          "Dedicated priority support concierge",
          "Zero deposit on select reserved holds",
        ],
      };
    } else if (points >= 1500) {
      return {
        tier: "Gold",
        nextTier: "Platinum",
        threshold: 2000,
        pointsToNext: 2000 - points,
        progressPercentage: Math.round(((points - 1500) / (2000 - 1500)) * 100),
        perks: [
          "Priority in-store pickup line",
          "Gold profile badge",
          "Special promotional flash drop pricing",
          "Early access to select drops (15m headstart)",
        ],
      };
    } else if (points >= 500) {
      return {
        tier: "Silver",
        nextTier: "Gold",
        threshold: 1500,
        pointsToNext: 1500 - points,
        progressPercentage: Math.round(((points - 500) / (1500 - 500)) * 100),
        perks: [
          "Silver active member badge",
          "Early restock notification alerts",
          "5% bonus loyalty points on in-store purchases",
        ],
      };
    } else {
      return {
        tier: "Bronze",
        nextTier: "Silver",
        threshold: 500,
        pointsToNext: 500 - points,
        progressPercentage: Math.round((points / 500) * 100),
        perks: ["Entry level member", "Standard order & reservation access"],
      };
    }
  }

  /**
   * Fetch VIP Loyalty status, progress, perks, and recent points log
   */
  static async getVipStatus(user: IJwtPayload) {
    const buyerObjectId = new Types.ObjectId(user.profileId);
    const buyer = (await BuyerModel.findById(buyerObjectId).lean()) as any;

    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found");
    }

    const points = buyer.vipPoints || 0;
    const tierMeta = this.determineTier(points);

    // Check daily login claim eligibility (24h cooldown)
    const now = Date.now();
    const lastClaim = buyer.lastDailyLoginClaim ? new Date(buyer.lastDailyLoginClaim).getTime() : 0;
    const cooldownMs = 24 * 60 * 60 * 1000;
    const canClaimDailyLogin = now - lastClaim >= cooldownMs;

    // Recent points activity
    const pointsHistory = await VipPointsLogModel.find({ buyerId: buyerObjectId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    return {
      currentPoints: points,
      currentTier: tierMeta.tier,
      nextTier: tierMeta.nextTier,
      pointsToNextTier: tierMeta.pointsToNext,
      progressPercentage: tierMeta.progressPercentage,
      perks: tierMeta.perks,
      canClaimDailyLogin,
      lastClaimedAt: buyer.lastDailyLoginClaim || null,
      history: pointsHistory,
    };
  }

  /**
   * Claim daily login +10 VIP points (Once per 24 hours)
   */
  static async claimDailyLogin(user: IJwtPayload) {
    const buyerObjectId = new Types.ObjectId(user.profileId);
    const buyer = (await BuyerModel.findById(buyerObjectId).lean()) as any;

    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found");
    }

    const now = Date.now();
    const lastClaim = buyer.lastDailyLoginClaim ? new Date(buyer.lastDailyLoginClaim).getTime() : 0;
    const cooldownMs = 24 * 60 * 60 * 1000;

    if (now - lastClaim < cooldownMs) {
      const remainingMs = cooldownMs - (now - lastClaim);
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Daily login reward already claimed. Next claim available in ${remainingHours} hours.`
      );
    }

    const pointsToAward = 10;
    await BuyerModel.findByIdAndUpdate(buyerObjectId, {
      $set: { lastDailyLoginClaim: new Date() },
    });

    const result = await this.awardPointsInternal(
      buyerObjectId,
      pointsToAward,
      "DAILY_LOGIN",
      "Daily check-in streak reward (+10 pts)"
    );

    return {
      pointsAwarded: pointsToAward,
      totalPoints: result.totalPoints,
      currentTier: result.currentTier,
      message: "Daily login bonus claimed successfully!",
    };
  }

  /**
   * Internal Helper: Award VIP points atomically and auto-recalculate tier
   */
  static async awardPointsInternal(
    buyerId: Types.ObjectId,
    points: number,
    source: TVipSource,
    description: string,
    referenceId?: Types.ObjectId,
    referenceModel?: string
  ) {
    // 1. Create Points Log
    await VipPointsLogModel.create({
      buyerId,
      points,
      source,
      description,
      referenceId,
      referenceModel,
    });

    // 2. Increment points atomically
    const buyer = await BuyerModel.findByIdAndUpdate(
      buyerId,
      { $inc: { vipPoints: points } },
      { new: true }
    );

    if (!buyer) return { totalPoints: 0, currentTier: "Bronze" };

    const newPoints = Math.max(0, buyer.vipPoints || 0);
    const tierMeta = this.determineTier(newPoints);

    if (buyer.vipTier !== tierMeta.tier) {
      buyer.vipTier = tierMeta.tier;
      await buyer.save();
    }

    // 3. Socket broadcast to buyer
    try {
      const io = getIO();
      io.to(buyerId.toString()).emit("vip_points_awarded", {
        pointsEarned: points,
        totalPoints: newPoints,
        currentTier: tierMeta.tier,
        source,
        description,
      });
    } catch (e) {
      // Non-blocking socket emission
    }

    return { totalPoints: newPoints, currentTier: tierMeta.tier };
  }
}
