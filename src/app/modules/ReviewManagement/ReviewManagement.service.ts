import { IJwtPayload } from "../../../interface/jwt.interface";
import { IReview } from "./ReviewManagement.interface";
import ReviewFacadeService from "./ReviewFacadeService";

/**
 * Backward-compatible ReviewManagementServices wrapper forwarding directly to ReviewFacadeService.
 * Follows Rule 3 (SRP & Facade Pattern) to eliminate giant monolithic files.
 */
export const ReviewManagementServices = {
  createReviewService: async (userDetails: IJwtPayload, payload: Partial<IReview>) => {
    return await ReviewFacadeService.createReview(userDetails, payload);
  },

  createReplyService: async (
    userDetails: IJwtPayload,
    payload: { reviewId: string; content: string }
  ) => {
    return await ReviewFacadeService.createReply(userDetails, payload);
  },

  getReviewsService: async (query: Record<string, any>) => {
    return await ReviewFacadeService.getReviews(query);
  },

  getSingleReviewService: async (reviewId: string) => {
    return await ReviewFacadeService.getSingleReview(reviewId);
  },
};

export default ReviewManagementServices;
