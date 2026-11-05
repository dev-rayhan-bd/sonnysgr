import { Request, Response } from "express";
import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { ReviewManagementServices } from "./ReviewManagement.service";
import { StatusCodes } from "http-status-codes";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await ReviewManagementServices.createReviewService(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: result.isVerifiedBuyer
      ? "Verified buyer review created successfully."
      : "Review created successfully.",
    data: result,
  });
});

const createReply = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await ReviewManagementServices.createReplyService(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Reply added to review successfully.",
    data: result,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewManagementServices.getReviewsService(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reviews and category metrics retrieved successfully.",
    meta: result.meta,
    data: {
      categoryAverages: result.categoryAverages,
      ratingBreakdown: result.ratingBreakdown,
      reviews: result.data,
    },
  });
});

const getSingleReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewManagementServices.getSingleReviewService(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Review details retrieved successfully.",
    data: result,
  });
});

export const ReviewManagementControllers = {
  createReview,
  createReply,
  getReviews,
  getSingleReview,
};

export default ReviewManagementControllers;
