import { z } from "zod";

const updateUserStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["Active", "Warning", "Banned", "Deactivated", "Suspended"]),
    reason: z.string().optional(),
  }),
});

const adjustTrustScoreValidationSchema = z.object({
  body: z.object({
    trustScore: z.number().min(0).max(100, "Trust score must be between 0 and 100"),
  }),
});

const reviewStoreValidationSchema = z.object({
  body: z.object({
    action: z.enum(["Approve", "Reject"]),
  }),
});

const UsersValidations = {
  updateUserStatusValidationSchema,
  adjustTrustScoreValidationSchema,
  reviewStoreValidationSchema,
};

export default UsersValidations;
