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
  body: z
    .object({
      action: z.enum(["Approve", "Reject", "UnderReview", "RequestMoreInfo"]),
      note: z.string().max(1000).optional(),
    })
    .refine((b) => !["Reject", "RequestMoreInfo"].includes(b.action) || !!b.note?.trim(), {
      message: "A note is required when rejecting or requesting more information",
      path: ["note"],
    }),
});

const requestMoreInfoValidationSchema = z.object({
  body: z.object({
    note: z.string().min(1, "Tell the store what information is missing").max(1000),
  }),
});

const rejectResellerValidationSchema = z.object({
  body: z.object({
    reason: z.string().min(1, "Rejection reason is required").max(1000),
  }),
});

const getAllUsersValidationSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    searchText: z.string().optional(),
    role: z.enum(["Buyer", "Retailer", "Reseller"]).optional(),
    status: z.enum(["Active", "Warning", "Banned", "Deactivated", "Suspended"]).optional(),
    approvalStatus: z.enum(["Pending", "Under Review", "More Info Requested", "Approved", "Rejected"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort: z.string().optional(),
  }),
});

const UsersValidations = {
  updateUserStatusValidationSchema,
  adjustTrustScoreValidationSchema,
  reviewStoreValidationSchema,
  requestMoreInfoValidationSchema,
  rejectResellerValidationSchema,
  getAllUsersValidationSchema,
};

export default UsersValidations;
