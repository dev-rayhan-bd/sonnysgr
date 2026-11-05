import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import OfferModel from "../Offer.model";
import LockerModel from "../../Locker/Locker.model";
import RetailerModel from "../../Retailer/Retailer.model";

/**
 * Sub-Service dedicated to Offer Creation, Withdrawals, Expiry & Fee Calculations
 */
export class OfferCommandSubService {
  /**
   * Submit purchase offer on a customer locker item (C2B Buyback / Trade-In)
   */
  static async sendOffer(
    userDetails: IJwtPayload,
    payload: {
      targetItemId: string;
      offerAmount: number;
      offerType?: "C2B_LOCKER" | "B2B_RESELLER";
      durationHours?: number;
      note?: string;
    }
  ) {
    const { profileId } = userDetails;
    const storeObjectId = new mongoose.Types.ObjectId(profileId);
    const { targetItemId, offerAmount, note, durationHours = 24 } = payload;

    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "A valid offer amount is required.");
    }

    // 1. Fetch Store details
    const retailer = (await RetailerModel.findById(storeObjectId).lean()) as any;
    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer store profile not found.");
    }

    // 2. Fetch and validate Target Locker Sneaker
    const lockerItem = await LockerModel.findById(targetItemId);
    if (!lockerItem) {
      throw new AppError(StatusCodes.NOT_FOUND, "Locker sneaker not found.");
    }

    if (!lockerItem.isAvailableForTradeIn) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This sneaker is not currently marked for trade-in / store buyback."
      );
    }

    if (lockerItem.status === "DEAL_ACCEPTED" || lockerItem.status === "SOLD_TO_STORE") {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot make an offer on sneaker in '${lockerItem.status}' state.`
      );
    }

    // Check for existing pending offer by this store on this item
    const existingOffer = await OfferModel.findOne({
      targetItemId: lockerItem._id,
      buyerStoreId: storeObjectId,
      status: "Pending",
    });

    if (existingOffer) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You already have a pending offer for this pair. Counter or wait for response."
      );
    }

    // 3. Transparent 5% Platform Fee Calculation (Section 3.5 Rule)
    const platformFeePercent = 5;
    const platformFeeAmount = Math.round(amount * 0.05 * 100) / 100;
    const netSellerPayout = Math.round((amount - platformFeeAmount) * 100) / 100;

    // 4. Calculate Expiry Timer Window
    const duration = Math.min(Math.max(Number(durationHours), 6), 72); // Between 6h and 72h
    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

    const initialTimeline = [
      {
        status: "Offer Sent",
        actorId: storeObjectId,
        actorRole: "Retailer" as const,
        amount,
        note: note || `Initial purchase offer of $${amount.toFixed(2)} submitted.`,
        timestamp: new Date(),
      },
    ];

    // 5. Create Offer Document
    const offer = await OfferModel.create({
      offerType: payload.offerType || "C2B_LOCKER",
      targetItemId: lockerItem._id,
      itemSnapshot: {
        name: lockerItem.name,
        brand: lockerItem.brand,
        size: lockerItem.size,
        condition: lockerItem.condition,
        itemImage: lockerItem.images?.[0] || "",
        askingPrice: lockerItem.askingPrice,
        styleCode: lockerItem.styleCode || "",
      },
      sellerId: lockerItem.buyerId,
      sellerRole: "Buyer",
      buyerStoreId: storeObjectId,
      storeName: retailer.name,
      storeAddress: retailer.address || "",
      askingPrice: lockerItem.askingPrice,
      currentOfferAmount: amount,
      platformFeePercent,
      platformFeeAmount,
      netSellerPayout,
      status: "Pending",
      expiresAt,
      note: note || "",
      timeline: initialTimeline,
    });

    // Mark locker item as having a pending offer
    await LockerModel.findByIdAndUpdate(lockerItem._id, {
      $set: { status: "OFFER_PENDING" },
    });

    return offer;
  }

  /**
   * Retailer retracts pending offer prior to seller response
   */
  static async withdrawOffer(userDetails: IJwtPayload, offerId: string) {
    const { profileId } = userDetails;

    const offer = await OfferModel.findOne({
      _id: offerId,
      buyerStoreId: profileId,
      status: "Pending",
    });

    if (!offer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Pending offer not found or access denied.");
    }

    offer.status = "Withdrawn";
    offer.timeline.push({
      status: "Offer Withdrawn",
      actorId: new mongoose.Types.ObjectId(profileId),
      actorRole: "Retailer",
      amount: offer.currentOfferAmount,
      note: "Offer retracted by store.",
      timestamp: new Date(),
    });

    await offer.save();

    // Check if other pending offers exist on target item
    const otherPending = await OfferModel.findOne({
      targetItemId: offer.targetItemId,
      status: "Pending",
    });

    if (!otherPending) {
      await LockerModel.findByIdAndUpdate(offer.targetItemId, {
        $set: { status: "IN_LOCKER" },
      });
    }

    return offer;
  }

  /**
   * Background scan for expired offers
   */
  static async handleExpiredOffers() {
    const now = new Date();
    const expiredOffers = await OfferModel.find({
      status: { $in: ["Pending", "Countered"] },
      expiresAt: { $lte: now },
    });

    for (const offer of expiredOffers) {
      offer.status = "Expired";
      offer.timeline.push({
        status: "Offer Expired",
        actorId: offer.buyerStoreId,
        actorRole: "Retailer",
        amount: offer.currentOfferAmount,
        note: "Offer expired automatically past validity window.",
        timestamp: now,
      });
      await offer.save();
    }
  }
}

