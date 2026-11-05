import { IJwtPayload } from "../../../interface/jwt.interface";
import { IReview } from "./ReviewManagement.interface";
import { ReviewCommandSubService } from "./subServices/ReviewCommandSubService";
import { ReviewQuerySubService } from "./subServices/ReviewQuerySubService";

/**
 * Review Facade Service: High-Level Orchestrator
 * Coordinates verified buyer reviews, multi-category ratings, and store reply engines (Module 12)
 */
export class ReviewFacadeService {
  // --- Creation & Replies ---
  static async createReview(userDetails: IJwtPayload, payload: Partial<IReview>) {
    return await ReviewCommandSubService.createReview(userDetails, payload);
  }

  static async createReply(
    userDetails: IJwtPayload,
    payload: { reviewId: string; content: string }
  ) {
    return await ReviewCommandSubService.createReply(userDetails, payload);
  }

  // --- Queries (Native Aggregation, Zero .populate()) ---
  static async getReviews(query: Record<string, any>) {
    return await ReviewQuerySubService.getReviews(query);
  }

  static async getSingleReview(reviewId: string) {
    return await ReviewQuerySubService.getSingleReview(reviewId);
  }
}

export default ReviewFacadeService;

