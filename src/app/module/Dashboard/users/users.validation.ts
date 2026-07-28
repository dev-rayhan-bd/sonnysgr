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

const UsersValidations = {
  updateUserStatusValidationSchema,
  adjustTrustScoreValidationSchema,
};

export default UsersValidations;
