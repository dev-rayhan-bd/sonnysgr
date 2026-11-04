import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { ReviewManagementControllers } from "./ReviewManagement.controller";
import { ReviewManagementValidations } from "./ReviewManagement.validation";

const ReviewManagementRouter = express.Router();

ReviewManagementRouter.post(
  "/create",
  auth(["Buyer", "Retailer"]),
  validateRequest(ReviewManagementValidations.createReviewValidationSchema),
  ReviewManagementControllers.createReview
);

ReviewManagementRouter.post(
  "/reply",
  auth(["Retailer", "Reseller"]),
  validateRequest(ReviewManagementValidations.createReplyValidationSchema),
  ReviewManagementControllers.createReply
);

ReviewManagementRouter.get(
  "/",
  ReviewManagementControllers.getReviews
);

ReviewManagementRouter.get(
  "/:id",
  ReviewManagementControllers.getSingleReview
);

export default ReviewManagementRouter;
  