import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { ReviewModel } from "../ReviewManagement.model";

/**
 * Sub-Service dedicated to Review Queries & Category Breakdowns
 * Strictly uses native MongoDB Aggregation Pipelines (Zero Mongoose .populate() — Rule 4)
 */
export class ReviewQuerySubService {
  /**
   * Get store/reseller reviews with verified badges, category averages, and official replies
   */
  static async getReviews(query: Record<string, any>) {
    const {
      reviewedId,
      reviewerId,
      reviewType,
      rating,
      isVerifiedBuyer,
      page = 1,
      limit = 10,
    } = query;

    const matchStage: Record<string, any> = {};

    if (reviewedId && mongoose.Types.ObjectId.isValid(reviewedId)) {
      matchStage.reviewedId = new mongoose.Types.ObjectId(reviewedId);
    }
    if (reviewerId && mongoose.Types.ObjectId.isValid(reviewerId)) {
      matchStage.reviewerId = new mongoose.Types.ObjectId(reviewerId);
    }
    if (reviewType) {
      matchStage.reviewType = reviewType;
    }
    if (rating) {
      matchStage.rating = Number(rating);
    }
    if (isVerifiedBuyer !== undefined) {
      matchStage.isVerifiedBuyer = isVerifiedBuyer === "true" || isVerifiedBuyer === true;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    // Single aggregated trip with $facet for metadata and category metrics
    const [result] = await ReviewModel.aggregate([
      { $match: matchStage },
      {
        $facet: {
          metrics: [
            {
              $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                avgOverall: { $avg: "$rating" },
                avgCustomerService: { $avg: "$customerServiceRating" },
                avgAuthenticity: { $avg: "$authenticityRating" },
                avgPickupSpeed: { $avg: "$pickupSpeedRating" },
                avgPricing: { $avg: "$pricingRating" },
                avgStoreExperience: { $avg: "$storeExperienceRating" },
                fiveStarCount: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
                fourStarCount: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                threeStarCount: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                twoStarCount: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                oneStarCount: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
              },
            },
          ],
          reviews: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            // Join Buyer Reviewer Profile
            {
              $lookup: {
                from: "buyers",
                localField: "reviewerId",
                foreignField: "_id",
                as: "buyerReviewer",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      email: 1,
                      image: 1,
                      shoeSize: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: "$buyerReviewer", preserveNullAndEmptyArrays: true } },
            // Join Retailer Reviewer Profile (if Retailer review)
            {
              $lookup: {
                from: "retailers",
                localField: "reviewerId",
                foreignField: "_id",
                as: "retailerReviewer",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      image: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: "$retailerReviewer", preserveNullAndEmptyArrays: true } },
            // Join Store Official Reply
            {
              $lookup: {
                from: "storereviewreplies",
                localField: "reply",
                foreignField: "_id",
                as: "officialReply",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      content: 1,
                      replierType: 1,
                      createdAt: 1,
                    },
                  },
                ],
              },
            },
            { $unwind: { path: "$officialReply", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                reviewerId: 1,
                reviewerType: 1,
                reviewer: {
                  $cond: {
                    if: { $eq: ["$reviewerType", "Buyer"] },
                    then: "$buyerReviewer",
                    else: "$retailerReviewer",
                  },
                },
                reviewedId: 1,
                reviewedType: 1,
                reviewType: 1,
                rating: 1,
                content: 1,
                customerServiceRating: 1,
                authenticityRating: 1,
                pickupSpeedRating: 1,
                pricingRating: 1,
                storeExperienceRating: 1,
                isVerifiedBuyer: 1,
                officialReply: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ]);

    const metricsData = result.metrics[0] || {
      totalReviews: 0,
      avgOverall: 0,
      avgCustomerService: 0,
      avgAuthenticity: 0,
      avgPickupSpeed: 0,
      avgPricing: 0,
      avgStoreExperience: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
    };

    const total = metricsData.totalReviews;
    const totalPage = Math.ceil(total / limitNum) || 1;

    return {
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPage,
      },
      categoryAverages: {
        overall: parseFloat((metricsData.avgOverall || 0).toFixed(1)),
        customerService: parseFloat((metricsData.avgCustomerService || 0).toFixed(1)),
        authenticity: parseFloat((metricsData.avgAuthenticity || 0).toFixed(1)),
        pickupSpeed: parseFloat((metricsData.avgPickupSpeed || 0).toFixed(1)),
        pricing: parseFloat((metricsData.avgPricing || 0).toFixed(1)),
        storeExperience: parseFloat((metricsData.avgStoreExperience || 0).toFixed(1)),
      },
      ratingBreakdown: {
        5: metricsData.fiveStarCount,
        4: metricsData.fourStarCount,
        3: metricsData.threeStarCount,
        2: metricsData.twoStarCount,
        1: metricsData.oneStarCount,
      },
      data: result.reviews || [],
    };
  }

  /**
   * Get single review details by ID
   */
  static async getSingleReview(reviewId: string) {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid review ID format.");
    }

    const reviews = await this.getReviews({ _id: reviewId, limit: 1 });
    if (!reviews.data || reviews.data.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, "Review not found.");
    }

    return reviews.data[0];
  }
}
