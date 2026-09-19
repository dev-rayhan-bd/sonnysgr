import { z } from "zod";

const createReviewValidationSchema = z.object({
  body: z.object({
    reviewedId: z.string().min(1, "Reviewed ID is required"),
    rating: z.number().min(1).max(5),
    content: z.string().min(1, "Review content cannot be empty"),
    customerServiceRating: z.number().min(1).max(5).optional(),
    authenticityRating: z.number().min(1).max(5).optional(),
    pickupSpeedRating: z.number().min(1).max(5).optional(),
    pricingRating: z.number().min(1).max(5).optional(),
    storeExperienceRating: z.number().min(1).max(5).optional(),
  }),
});

const createReplyValidationSchema = z.object({
  body: z.object({
    reviewId: z.string().min(1, "Review ID is required"),
    content: z.string().min(1, "Reply content cannot be empty"),
  }),
});

export const ReviewManagementValidations = {
  createReviewValidationSchema,
  createReplyValidationSchema,
};
