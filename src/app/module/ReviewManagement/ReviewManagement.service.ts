import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { IReview, IReviewReply } from "./ReviewManagement.interface";
import { ReviewModel, ReviewReplyModel } from "./ReviewManagement.model";
import BuyerModel from "../Buyer/Buyer.model";
import RetailerModel from "../Retailer/Retailer.model";
import ResellerModel from "../Reseller/Reseller.model";
import { IJwtPayload } from "../../../interface/jwt.interface";

const createReviewService = async (
  userDetails: IJwtPayload,
  payload: Partial<IReview>
) => {
  const { profileId, role } = userDetails;
  const { reviewedId, rating, content } = payload;

  if (!reviewedId) {
    throw new ApiError(400, "Reviewed entity ID is required.");
  }

  const reviewerObjectId = new mongoose.Types.ObjectId(profileId);
  const reviewedObjectId = new mongoose.Types.ObjectId(reviewedId);

  let reviewerType: "Buyer" | "Retailer";
  let reviewedType: "Retailer" | "Reseller";
  let reviewType: "BuyerToRetailer" | "RetailerToReseller";

  if (role === "Buyer") {
    reviewerType = "Buyer";
    reviewedType = "Retailer";
    reviewType = "BuyerToRetailer";

    // Verify buyer exists
    const buyerExists = await BuyerModel.findById(reviewerObjectId);
    if (!buyerExists) {
      throw new ApiError(404, "Buyer profile not found.");
    }

    // Verify retailer exists
    const retailerExists = await RetailerModel.findById(reviewedObjectId);
    if (!retailerExists) {
      throw new ApiError(404, "Retailer profile not found.");
    }
  } else if (role === "Retailer") {
    reviewerType = "Retailer";
    reviewedType = "Reseller";
    reviewType = "RetailerToReseller";

    // Verify retailer exists
    const retailerExists = await RetailerModel.findById(reviewerObjectId);
    if (!retailerExists) {
      throw new ApiError(404, "Retailer profile not found.");
    }

    // Verify reseller exists
    const resellerExists = await ResellerModel.findById(reviewedObjectId);
    if (!resellerExists) {
      throw new ApiError(404, "Reseller profile not found.");
    }
  } else {
    throw new ApiError(403, "You are not authorized to leave reviews.");
  }

  // Check if a review already exists
  const existingReview = await ReviewModel.findOne({
    reviewerId: reviewerObjectId,
    reviewedId: reviewedObjectId,
    reviewType,
  });

  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this entity.");
  }

  // Create review
  const reviewData: Partial<IReview> = {
    reviewerId: reviewerObjectId,
    reviewerType,
    reviewedId: reviewedObjectId,
    reviewedType,
    reviewType,
    rating,
    content,
  };

  if (reviewType === "BuyerToRetailer") {
    reviewData.customerServiceRating = payload.customerServiceRating || rating;
    reviewData.authenticityRating = payload.authenticityRating || rating;
    reviewData.pickupSpeedRating = payload.pickupSpeedRating || rating;
    reviewData.pricingRating = payload.pricingRating || rating;
    reviewData.storeExperienceRating = payload.storeExperienceRating || rating;
  }

  const newReview = await ReviewModel.create(reviewData);

  // Update stats
  if (reviewType === "BuyerToRetailer") {
    // Increment Buyer review count
    await BuyerModel.findByIdAndUpdate(reviewerObjectId, {
      $inc: { myReviews: 1 },
    });

    // Recalculate average rating for Retailer
    const reviews = await ReviewModel.find({
      reviewedId: reviewedObjectId,
      reviewType: "BuyerToRetailer",
    });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? parseFloat((totalRating / reviews.length).toFixed(1)) : 0;

    await RetailerModel.findByIdAndUpdate(reviewedObjectId, {
      averageRating,
    });
  }

  return newReview;
};

const createReplyService = async (
  userDetails: IJwtPayload,
  payload: { reviewId: string; content: string }
) => {
  const { profileId, role } = userDetails;
  const { reviewId, content } = payload;

  const reviewObjectId = new mongoose.Types.ObjectId(reviewId);
  const replierObjectId = new mongoose.Types.ObjectId(profileId);

  const review = await ReviewModel.findById(reviewObjectId);
  if (!review) {
    throw new ApiError(404, "Review not found.");
  }

  // Check if reply already exists
  if (review.reply) {
    throw new ApiError(400, "A reply already exists for this review.");
  }

  // Authorize who can reply
  // For BuyerToRetailer: Only the reviewed Retailer can reply
  // For RetailerToReseller: Only the reviewed Reseller can reply
  let replierType: "Retailer" | "Reseller";

  if (review.reviewType === "BuyerToRetailer") {
    if (role !== "Retailer" || review.reviewedId.toString() !== profileId) {
      throw new ApiError(403, "You are not authorized to reply to this review.");
    }
    replierType = "Retailer";
  } else if (review.reviewType === "RetailerToReseller") {
    if (role !== "Reseller" || review.reviewedId.toString() !== profileId) {
      throw new ApiError(403, "You are not authorized to reply to this review.");
    }
    replierType = "Reseller";
  } else {
    throw new ApiError(400, "Invalid review type for reply.");
  }

  // Create reply
  const newReply = await ReviewReplyModel.create({
    reviewId: reviewObjectId,
    replierId: replierObjectId,
    replierType,
    content,
  });

  // Link reply to the review
  await ReviewModel.findByIdAndUpdate(reviewObjectId, {
    reply: newReply._id,
  });

  return newReply;
};

const getReviewsService = async (query: Record<string, any>) => {
  const { reviewedId, reviewerId, reviewType, limit = 10, page = 1 } = query;

  const filter: Record<string, any> = {};

  if (reviewedId) {
    filter.reviewedId = new mongoose.Types.ObjectId(reviewedId);
  }
  if (reviewerId) {
    filter.reviewerId = new mongoose.Types.ObjectId(reviewerId);
  }
  if (reviewType) {
    filter.reviewType = reviewType;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const result = await ReviewModel.find(filter)
    .populate({
      path: "reviewerId",
      select: "name email image",
    })
    .populate({
      path: "reviewedId",
      select: "name email image",
    })
    .populate({
      path: "reply",
      populate: {
        path: "replierId",
        select: "name email image",
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await ReviewModel.countDocuments(filter);

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
    data: result,
  };
};

const getSingleReviewService = async (id: string) => {
  const result = await ReviewModel.findById(id)
    .populate({
      path: "reviewerId",
      select: "name email image",
    })
    .populate({
      path: "reviewedId",
      select: "name email image",
    })
    .populate({
      path: "reply",
      populate: {
        path: "replierId",
        select: "name email image",
      },
    })
    .lean();

  if (!result) {
    throw new ApiError(404, "Review not found.");
  }

  return result;
};

export const ReviewManagementServices = {
  createReviewService,
  createReplyService,
  getReviewsService,
  getSingleReviewService,
};
