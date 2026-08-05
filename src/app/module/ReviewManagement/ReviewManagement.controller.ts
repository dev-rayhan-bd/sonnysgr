import { Request, Response } from "express";
import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { ReviewManagementServices } from "./ReviewManagement.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await ReviewManagementServices.createReviewService(user, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Review created successfully.",
    data: result,
  });
});

const createReply = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await ReviewManagementServices.createReplyService(user, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Reply added to review successfully.",
    data: result,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewManagementServices.getReviewsService(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reviews retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewManagementServices.getSingleReviewService(req.params.id);

  sendResponse(res, {
    statusCode: 200,
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
