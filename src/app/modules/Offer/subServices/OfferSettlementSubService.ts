import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import OfferModel from "../Offer.model";
import LockerModel from "../../Locker/Locker.model";
import BuyerModel from "../../Buyer/Buyer.model";
import { ProductModel } from "../../Product/Product.model";
import { BuyerHistorySubService } from "../../Buyer/subServices/BuyerHistorySubService";

/**
 * Sub-Service dedicated to In-Store Drop-off Verification, Payout Settlement & Store Inventory Sync
 */
export class OfferSettlementSubService {
  /**
   * Retailer scans / enters 6-digit drop-off verification code to finalize buyout
   */
  static async verifyDropoffAndSettle(
    userDetails: IJwtPayload,
    payload: {
      dropoffVerificationCode: string;
      offerId?: string;
      conditionNotes?: string;
      addToInventory?: boolean;
      listingPrice?: number;
      branchId?: string;
    }
  ) {
    const { profileId } = userDetails;
    const storeObjectId = new mongoose.Types.ObjectId(profileId);
    const code = String(payload.dropoffVerificationCode || "").trim().toUpperCase();

    if (!code) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Drop-off verification code is required.");
    }

    const queryFilter: any = {
      buyerStoreId: storeObjectId,
      status: "Accepted",
      dropoffVerificationCode: { $regex: new RegExp(`^${code}$`, "i") },
    };

    if (payload.offerId) {
      queryFilter._id = new mongoose.Types.ObjectId(payload.offerId);
    }

    const offer = await OfferModel.findOne(queryFilter);
    if (!offer) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "No accepted deal found matching this drop-off verification code for your store."
      );
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. Mark Offer as Completed
      offer.status = "Completed";
      offer.timeline.push({
        status: "Drop-off Verified & Completed",
        actorId: storeObjectId,
        actorRole: "Retailer",
        amount: offer.currentOfferAmount,
        note: payload.conditionNotes || "Physical sneaker inspected and verified in-store. Trade-in deal finalized.",
        timestamp: new Date(),
      });
      await offer.save({ session });

      // 2. Mark Locker Item as Sold to Store
      await LockerModel.findByIdAndUpdate(
        offer.targetItemId,
        {
          $set: {
            status: "SOLD_TO_STORE",
            isAvailableForTradeIn: false,
            isPublic: false,
          },
        },
        { session }
      );

      // 3. Atomically credit Net Payout to Seller's Wallet
      if (offer.sellerRole === "Buyer") {
        await BuyerModel.findByIdAndUpdate(
          offer.sellerId,
          { $inc: { walletBalance: offer.netSellerPayout } },
          { session }
        );
      }

      // 4. Optionally Auto-Add Sneaker to Retailer's Store Inventory
      let createdProduct = null;
      if (payload.addToInventory === true || (payload.addToInventory as any) === "true") {
        const targetPrice = payload.listingPrice ? Number(payload.listingPrice) : Math.round(offer.currentOfferAmount * 1.25);
        const [product] = await ProductModel.create(
          [
            {
              retailerId: storeObjectId,
              branchId: payload.branchId ? new mongoose.Types.ObjectId(payload.branchId) : undefined,
              name: offer.itemSnapshot.name,
              brand: offer.itemSnapshot.brand,
              category: "Shoes",
              images: offer.itemSnapshot.itemImage ? [offer.itemSnapshot.itemImage] : [],
              price: targetPrice,
              availability: "Active",
              details: `Trade-in acquired via GoSNKR Sell-to-Store. Condition: ${offer.itemSnapshot.condition}`,
              variant: [
                {
                  size: offer.itemSnapshot.size,
                  stock: 1,
                  price: targetPrice,
                  costPrice: offer.currentOfferAmount,
                  sku: offer.itemSnapshot.styleCode || `BUYBACK-${Date.now().toString().slice(-6)}`,
                },
              ],
              sneakerAttributes: {
                condition: offer.itemSnapshot.condition,
                boxCondition: "Original Box",
              },
            },
          ],
          { session }
        );
        createdProduct = product;
      }

      await session.commitTransaction();

      // Module 1.9: Log physical store visit for C2B sneaker drop-off
      BuyerHistorySubService.logStoreVisitInternal(
        offer.sellerId,
        storeObjectId,
        "C2B_TRADE_IN",
        offer._id,
        "Offer"
      ).catch(() => {});

      return {
        success: true,
        message: "Sneaker drop-off verified successfully. Payout credited to seller.",
        settlement: {
          offerId: offer._id,
          verificationCode: offer.dropoffVerificationCode,
          grossPurchaseAmount: offer.currentOfferAmount,
          platformFeeCollected: offer.platformFeeAmount,
          sellerNetPayoutCredited: offer.netSellerPayout,
          settledAt: new Date(),
          addedToInventory: !!createdProduct,
          createdProduct: createdProduct ? { _id: createdProduct._id, name: createdProduct.name } : null,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Scan accepted offers where 24 hours have elapsed without in-store physical drop-off (Module 17.5)
   * Reverts sneaker status to IN_LOCKER and marks offer as Expired
   */
  static async expireOverdueAcceptedOffers() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const overdueAcceptedOffers = await OfferModel.find({
      status: "Accepted",
      updatedAt: { $lte: twentyFourHoursAgo },
    });

    let expiredCount = 0;
    for (const offer of overdueAcceptedOffers) {
      offer.status = "Expired";
      offer.timeline.push({
        status: "Drop-off Window Expired",
        actorId: offer.buyerStoreId,
        actorRole: "Retailer",
        amount: offer.currentOfferAmount,
        note: "In-store drop-off window (24 hours) passed without physical sneaker inspection. Deal cancelled and item restored to locker.",
        timestamp: new Date(),
      });
      await offer.save();

      // Revert locker sneaker status
      if (offer.offerType === "C2B_LOCKER" && offer.targetItemId) {
        await LockerModel.findByIdAndUpdate(offer.targetItemId, {
          $set: { status: "IN_LOCKER" },
        });
      }

      expiredCount++;
    }

    return { expiredCount };
  }
}
