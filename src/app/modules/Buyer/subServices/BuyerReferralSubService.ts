import mongoose, { Types } from "mongoose";
import BuyerModel from "../Buyer.model";
import { ReferralRewardModel } from "../loyalty/Loyalty.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { BuyerLoyaltySubService } from "./BuyerLoyaltySubService";
import { getIO } from "../../../utils/socket";

export class BuyerReferralSubService {
  /**
   * Helper to generate a unique readable referral code (e.g. GS-K8M2X1)
   */
  static generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomStr = "";
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `GS-${randomStr}`;
  }

  /**
   * Fetch authenticated buyer's unique referral code and social share links
   */
  static async getMyReferralCode(user: IJwtPayload) {
    const buyerObjectId = new Types.ObjectId(user.profileId);
    let buyer = await BuyerModel.findById(buyerObjectId);

    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found");
    }

    if (!buyer.referralCode) {
      buyer.referralCode = this.generateCode();
      await buyer.save();
    }

    const code = buyer.referralCode;
    const shareUrl = `https://gosnkr.com/join?ref=${code}`;
    const shareText = `Use my code ${code} on GoSNKR to get $10 credit on your first sneaker purchase! ${shareUrl}`;

    return {
      referralCode: code,
      rewardAmountPerReferral: 10,
      shareUrl,
      shareLinks: {
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
        sms: `sms:?body=${encodeURIComponent(shareText)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      },
      rules: {
        refereeReward: "$10 credit upon first purchase",
        referrerReward: "$10 credit + 30 VIP points upon friend's first purchase",
      },
    };
  }

  /**
   * Apply a friend's referral code
   */
  static async applyReferralCode(user: IJwtPayload, rawCode: string) {
    const buyerObjectId = new Types.ObjectId(user.profileId);
    const code = rawCode.trim().toUpperCase();

    const buyer = await BuyerModel.findById(buyerObjectId);
    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found");
    }

    if (buyer.referredBy) {
      throw new AppError(StatusCodes.BAD_REQUEST, "You have already applied a referral code.");
    }

    if (buyer.hasCompletedFirstPurchase) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Referral codes can only be applied prior to completing your first order."
      );
    }

    const referrer = await BuyerModel.findOne({ referralCode: code });
    if (!referrer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Invalid or non-existent referral code.");
    }

    if (referrer._id.equals(buyerObjectId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "You cannot apply your own referral code.");
    }

    // Link referrer
    buyer.referredBy = referrer._id;
    await buyer.save();

    // Create pending reward record
    await ReferralRewardModel.create({
      referrerId: referrer._id,
      refereeId: buyerObjectId,
      referralCode: code,
      rewardAmount: 10,
      status: "PENDING_FIRST_PURCHASE",
    });

    return {
      success: true,
      message: `Referral code ${code} applied successfully! You and your friend will receive $10 credit once your first order completes.`,
    };
  }

  /**
   * Fetch referral earnings summary, successful invites, and pending payouts (Native Aggregation)
   */
  static async getReferralEarnings(user: IJwtPayload) {
    const buyerObjectId = new Types.ObjectId(user.profileId);
    const buyer = (await BuyerModel.findById(buyerObjectId).lean()) as any;

    if (!buyer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found");
    }

    // Aggregate rewards list with referee profiles (Zero .populate())
    const rewards = await ReferralRewardModel.aggregate([
      { $match: { referrerId: buyerObjectId } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "buyers",
          localField: "refereeId",
          foreignField: "_id",
          as: "referee",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$referee" },
      {
        $project: {
          _id: 1,
          status: 1,
          rewardAmount: 1,
          rewardedAt: 1,
          createdAt: 1,
          refereeName: "$referee.name",
          refereeImage: "$referee.image",
        },
      },
    ]);

    const rewardedList = rewards.filter((r) => r.status === "REWARDED");
    const pendingList = rewards.filter((r) => r.status === "PENDING_FIRST_PURCHASE");

    return {
      walletBalance: buyer.walletBalance || 0,
      totalEarnedFromReferrals: rewardedList.length * 10,
      successfulInvitesCount: rewardedList.length,
      pendingInvitesCount: pendingList.length,
      invitedFriends: rewards,
    };
  }

  /**
   * Internal Hook: Award $10 platform credit to both parties upon referee's first purchase
   */
  static async processFirstPurchaseRewardInternal(
    refereeBuyerId: Types.ObjectId,
    orderId: Types.ObjectId
  ) {
    const referee = await BuyerModel.findById(refereeBuyerId);
    if (!referee || referee.hasCompletedFirstPurchase) {
      return; // Already completed or not eligible
    }

    // Mark first purchase as completed
    referee.hasCompletedFirstPurchase = true;
    await referee.save();

    // Check if there was a pending referral reward
    const reward = await ReferralRewardModel.findOne({
      refereeId: refereeBuyerId,
      status: "PENDING_FIRST_PURCHASE",
    });

    if (!reward) return;

    const rewardAmount = reward.rewardAmount || 10;

    // 1. Credit Referrer Wallet + Award +30 VIP points
    await BuyerModel.findByIdAndUpdate(reward.referrerId, {
      $inc: { walletBalance: rewardAmount },
    });
    BuyerLoyaltySubService.awardPointsInternal(
      reward.referrerId,
      30,
      "REFERRAL_BONUS",
      "Referral bonus: friend completed first purchase (+30 pts)",
      orderId,
      "Order"
    ).catch(() => {});

    // 2. Credit Referee Wallet
    await BuyerModel.findByIdAndUpdate(refereeBuyerId, {
      $inc: { walletBalance: rewardAmount },
    });

    // 3. Mark reward as completed
    reward.status = "REWARDED";
    reward.rewardedAt = new Date();
    reward.orderId = orderId;
    await reward.save();

    // 4. Socket notifications
    try {
      const io = getIO();
      io.to(reward.referrerId.toString()).emit("referral_reward_earned", {
        amount: rewardAmount,
        message: `You earned $${rewardAmount} credit! Your invited friend completed their first sneaker purchase.`,
      });
      io.to(refereeBuyerId.toString()).emit("referral_reward_earned", {
        amount: rewardAmount,
        message: `You unlocked $${rewardAmount} welcome credit for completing your first purchase!`,
      });
    } catch (e) {
      // Non-blocking socket error
    }
  }
}
