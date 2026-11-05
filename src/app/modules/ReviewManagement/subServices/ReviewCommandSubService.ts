import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IReview } from "../ReviewManagement.interface";
import { ReviewModel, ReviewReplyModel } from "../ReviewManagement.model";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import { OrderItemModel } from "../../Order/Order.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import { ENUM_ORDER_ITEM_STATUS } from "../../../../utilities/enum";
import { BuyerLoyaltySubService } from "../../Buyer/subServices/BuyerLoyaltySubService";

/**
 * Sub-Service dedicated to Review Creation, Verification Badges & Official Store Replies
 * Module 12: Ratings & Reviews Engine
 */
export class ReviewCommandSubService {
  /**
   * Create a review with multi-category ratings and auto-detection of Verified Buyer Badge
   */
  static async createReview(userDetails: IJwtPayload, payload: Partial<IReview>) {
    const { profileId, role } = userDetails;
    const { reviewedId, rating, content } = payload;

    if (!reviewedId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Reviewed entity ID is required.");
    }

    if (!rating || rating < 1 || rating > 5) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Rating must be an integer between 1 and 5.");
    }

    if (!content || !content.trim()) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Review content is required.");
    }

    const reviewerObjectId = new mongoose.Types.ObjectId(profileId);
    const reviewedObjectId = new mongoose.Types.ObjectId(reviewedId);

    let reviewerType: "Buyer" | "Retailer";
    let reviewedType: "Retailer" | "Reseller";
    let reviewType: "BuyerToRetailer" | "RetailerToReseller";
    let isVerifiedBuyer = false;
    let verifiedOrderId: mongoose.Types.ObjectId | null = null;

    if (role === "Buyer") {
      reviewerType = "Buyer";
      reviewedType = "Retailer";
      reviewType = "BuyerToRetailer";

      const [buyerExists, retailerExists] = await Promise.all([
        BuyerModel.findById(reviewerObjectId),
        RetailerModel.findById(reviewedObjectId),
      ]);

      if (!buyerExists) {
        throw new AppError(StatusCodes.NOT_FOUND, "Buyer profile not found.");
      }
      if (!retailerExists) {
        throw new AppError(StatusCodes.NOT_FOUND, "Retailer store not found.");
      }

      // Module 12.1: Check Verified Buyer Badge via completed purchases
      const completedPurchase = await OrderItemModel.findOne({
        buyerId: reviewerObjectId,
        retailerId: reviewedObjectId,
        status: ENUM_ORDER_ITEM_STATUS.COMPLETED,
      }).select("orderId");

      if (completedPurchase) {
        isVerifiedBuyer = true;
        verifiedOrderId = completedPurchase.orderId;
      }
    } else if (role === "Retailer") {
      reviewerType = "Retailer";
      reviewedType = "Reseller";
      reviewType = "RetailerToReseller";

      const [retailerExists, resellerExists] = await Promise.all([
        RetailerModel.findById(reviewerObjectId),
        ResellerModel.findById(reviewedObjectId),
      ]);

      if (!retailerExists) {
        throw new AppError(StatusCodes.NOT_FOUND, "Retailer profile not found.");
      }
      if (!resellerExists) {
        throw new AppError(StatusCodes.NOT_FOUND, "Reseller profile not found.");
      }
    } else {
      throw new AppError(StatusCodes.FORBIDDEN, "You are not authorized to leave reviews.");
    }

    // Check duplicate review
    const existingReview = await ReviewModel.findOne({
      reviewerId: reviewerObjectId,
      reviewedId: reviewedObjectId,
      reviewType,
    });

    if (existingReview) {
      throw new AppError(StatusCodes.BAD_REQUEST, "You have already reviewed this store.");
    }

    // Construct multi-category ratings (Module 12.2)
    const reviewData: Partial<IReview> = {
      reviewerId: reviewerObjectId,
      reviewerType,
      reviewedId: reviewedObjectId,
      reviewedType,
      reviewType,
      rating: Number(rating),
      content: content.trim(),
      customerServiceRating: Number(payload.customerServiceRating || rating),
      authenticityRating: Number(payload.authenticityRating || rating),
      pickupSpeedRating: Number(payload.pickupSpeedRating || rating),
      pricingRating: Number(payload.pricingRating || rating),
      storeExperienceRating: Number(payload.storeExperienceRating || rating),
      isVerifiedBuyer,
      orderId: verifiedOrderId,
    };

    const newReview = await ReviewModel.create(reviewData);

    // Update Buyer and Retailer Aggregated Stats
    if (reviewType === "BuyerToRetailer") {
      await BuyerModel.findByIdAndUpdate(reviewerObjectId, {
        $inc: { myReviews: 1 },
      });

      // Module 13.2: Award +20 VIP Loyalty Points for writing a verified store review
      BuyerLoyaltySubService.awardPointsInternal(
        reviewerObjectId,
        20,
        "REVIEW",
        "Store review contribution reward (+20 VIP pts)",
        newReview._id,
        "Review"
      ).catch(() => {});

      // Recalculate average rating for Retailer
      const reviews = await ReviewModel.find({
        reviewedId: reviewedObjectId,
        reviewType: "BuyerToRetailer",
      }).select("rating");

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = reviews.length > 0 ? parseFloat((totalRating / reviews.length).toFixed(1)) : 0;

      await RetailerModel.findByIdAndUpdate(reviewedObjectId, {
        averageRating,
      });
    }

    return newReview;
  }

  /**
   * Official response reply from Retailer or Reseller
   */
  static async createReply(
    userDetails: IJwtPayload,
    payload: { reviewId: string; content: string }
  ) {
    const { profileId, role } = userDetails;
    const { reviewId, content } = payload;

    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Valid reviewId is required.");
    }

    if (!content || !content.trim()) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Reply content is required.");
    }

    const reviewObjectId = new mongoose.Types.ObjectId(reviewId);
    const replierObjectId = new mongoose.Types.ObjectId(profileId);

    const review = await ReviewModel.findById(reviewObjectId);
    if (!review) {
      throw new AppError(StatusCodes.NOT_FOUND, "Review not found.");
    }

    if (review.reply) {
      throw new AppError(StatusCodes.BAD_REQUEST, "A reply already exists for this review.");
    }

    let replierType: "Retailer" | "Reseller";

    if (review.reviewType === "BuyerToRetailer") {
      if (role !== "Retailer" || review.reviewedId.toString() !== profileId) {
        throw new AppError(StatusCodes.FORBIDDEN, "Only the reviewed retailer can reply to this review.");
      }
      replierType = "Retailer";
    } else if (review.reviewType === "RetailerToReseller") {
      if (role !== "Reseller" || review.reviewedId.toString() !== profileId) {
        throw new AppError(StatusCodes.FORBIDDEN, "Only the reviewed reseller can reply to this review.");
      }
      replierType = "Reseller";
    } else {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid review type for reply.");
    }

    const newReply = await ReviewReplyModel.create({
      reviewId: reviewObjectId,
      replierId: replierObjectId,
      replierType,
      content: content.trim(),
    });

    await ReviewModel.findByIdAndUpdate(reviewObjectId, {
      reply: newReply._id,
    });

    return newReply;
  }
}

