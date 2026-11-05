import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import OfferModel from "../Offer.model";
import LockerModel from "../../Locker/Locker.model";

/**
 * Sub-Service dedicated to Multi-Round Negotiations (Counter-Offer, Accept, Decline)
 */
export class OfferNegotiationSubService {
  /**
   * Submit a Counter-Offer price with transparent 5% fee recalculation
   */
  static async counterOffer(
    userDetails: IJwtPayload,
    offerId: string,
    payload: { counterAmount: number; durationHours?: number; note?: string }
  ) {
    const { profileId, role } = userDetails;
    const actorObjectId = new mongoose.Types.ObjectId(profileId);
    const counterAmount = Number(payload.counterAmount);

    if (!counterAmount || counterAmount <= 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "A valid counter-offer amount is required.");
    }

    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Offer not found.");
    }

    if (offer.status !== "Pending" && offer.status !== "Countered") {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot counter an offer with '${offer.status}' status.`
      );
    }

    // Check expiration
    if (new Date(offer.expiresAt).getTime() <= Date.now()) {
      offer.status = "Expired";
      await offer.save();
      throw new AppError(StatusCodes.BAD_REQUEST, "This offer has already expired.");
    }

    // Determine actor role and counterpart
    const isSeller = String(offer.sellerId) === String(profileId);
    const isBuyerStore = String(offer.buyerStoreId) === String(profileId);

    if (!isSeller && !isBuyerStore) {
      throw new AppError(StatusCodes.FORBIDDEN, "You are not a participant in this negotiation.");
    }

    const actorRole = isSeller ? (offer.sellerRole as "Buyer" | "Reseller") : "Retailer";

    // Recalculate transparent 5% platform fee
    const platformFeePercent = 5;
    const platformFeeAmount = Math.round(counterAmount * 0.05 * 100) / 100;
    const netSellerPayout = Math.round((counterAmount - platformFeeAmount) * 100) / 100;

    // Reset expiry timer window (default 24h)
    const duration = Math.min(Math.max(Number(payload.durationHours || 24), 6), 72);
    const newExpiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

    offer.currentOfferAmount = counterAmount;
    offer.platformFeeAmount = platformFeeAmount;
    offer.netSellerPayout = netSellerPayout;
    offer.status = "Countered";
    offer.expiresAt = newExpiresAt;

    offer.timeline.push({
      status: "Counter-Offer Sent",
      actorId: actorObjectId,
      actorRole,
      amount: counterAmount,
      note: payload.note || `Counter-offer of $${counterAmount.toFixed(2)} proposed by ${actorRole}.`,
      timestamp: new Date(),
    });

    await offer.save();
    return offer;
  }

  /**
   * Accept the latest offer/counter-offer -> Generates in-store drop-off code
   */
  static async acceptOffer(userDetails: IJwtPayload, offerId: string) {
    const { profileId } = userDetails;
    const actorObjectId = new mongoose.Types.ObjectId(profileId);

    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Offer not found.");
    }

    if (offer.status !== "Pending" && offer.status !== "Countered") {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot accept an offer with '${offer.status}' status.`
      );
    }

    if (new Date(offer.expiresAt).getTime() <= Date.now()) {
      offer.status = "Expired";
      await offer.save();
      throw new AppError(StatusCodes.BAD_REQUEST, "This offer has expired.");
    }

    const isSeller = String(offer.sellerId) === String(profileId);
    const isBuyerStore = String(offer.buyerStoreId) === String(profileId);

    if (!isSeller && !isBuyerStore) {
      throw new AppError(StatusCodes.FORBIDDEN, "You are not a participant in this deal.");
    }

    const actorRole = isSeller ? (offer.sellerRole as "Buyer" | "Reseller") : "Retailer";

    // 1. Generate 6-Digit In-Store Drop-Off Verification Code
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const dropoffVerificationCode = `GS-DROP-${randomCode}`;

    offer.status = "Accepted";
    offer.dropoffVerificationCode = dropoffVerificationCode;

    offer.timeline.push({
      status: "Offer Accepted",
      actorId: actorObjectId,
      actorRole,
      amount: offer.currentOfferAmount,
      note: "Deal confirmed. Please drop off the sneaker at the store within 24 hours for inspection and payout.",
      timestamp: new Date(),
    });

    await offer.save();

    // 2. Lock the target Locker Sneaker
    await LockerModel.findByIdAndUpdate(offer.targetItemId, {
      $set: { status: "DEAL_ACCEPTED" },
    });

    // 3. Automatically decline any competing pending offers on the same sneaker
    await OfferModel.updateMany(
      {
        targetItemId: offer.targetItemId,
        _id: { $ne: offer._id },
        status: { $in: ["Pending", "Countered"] },
      },
      {
        $set: {
          status: "Declined",
          note: "Item sold to another store.",
        },
      }
    );

    return offer;
  }

  /**
   * Decline the offer / counter-offer
   */
  static async declineOffer(
    userDetails: IJwtPayload,
    offerId: string,
    reason?: string
  ) {
    const { profileId } = userDetails;
    const actorObjectId = new mongoose.Types.ObjectId(profileId);

    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Offer not found.");
    }

    if (offer.status !== "Pending" && offer.status !== "Countered") {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot decline an offer with '${offer.status}' status.`
      );
    }

    const isSeller = String(offer.sellerId) === String(profileId);
    const isBuyerStore = String(offer.buyerStoreId) === String(profileId);

    if (!isSeller && !isBuyerStore) {
      throw new AppError(StatusCodes.FORBIDDEN, "You are not a participant in this negotiation.");
    }

    const actorRole = isSeller ? (offer.sellerRole as "Buyer" | "Reseller") : "Retailer";

    offer.status = "Declined";
    offer.timeline.push({
      status: "Offer Declined",
      actorId: actorObjectId,
      actorRole,
      amount: offer.currentOfferAmount,
      note: reason || "Offer declined.",
      timestamp: new Date(),
    });

    await offer.save();

    // Check if other active pending offers exist on target item
    const otherPending = await OfferModel.findOne({
      targetItemId: offer.targetItemId,
      status: { $in: ["Pending", "Countered"] },
    });

    if (!otherPending) {
      await LockerModel.findByIdAndUpdate(offer.targetItemId, {
        $set: { status: "IN_LOCKER" },
      });
    }

    return offer;
  }
}

