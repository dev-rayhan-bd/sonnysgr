import { z } from "zod";
import { dateRangeQuery, idParamSchema } from "../dashboard.shared";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const bool = z.enum(["true", "false"]);
const listQuery = {
  ...dateRangeQuery,
  searchTerm: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
};

const reportsListValidation = z.object({
  query: z.object({
    ...listQuery,
    isSolved: bool.optional(),
    isUrgent: bool.optional(),
    title: z.string().optional(),
    retailerId: objectId.optional(),
  }),
});

const resolveReportValidation = idParamSchema().extend({
  body: z.object({
    resolution: z.string().min(1, "Resolution note is required").max(1000),
    isSolved: z.boolean().optional(),
  }),
});

const reviewsListValidation = z.object({
  query: z.object({
    ...listQuery,
    reviewType: z.enum(["BuyerToRetailer", "RetailerToReseller"]).optional(),
    reviewedId: objectId.optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    isVerifiedBuyer: bool.optional(),
  }),
});

const dropsListValidation = z.object({
  query: z.object({
    ...listQuery,
    approvalStatus: z.enum(["Pending", "Approved", "Rejected"]).optional(),
    retailerId: objectId.optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
  }),
});

const reviewDropValidation = idParamSchema().extend({
  body: z
    .object({
      action: z.enum(["Approve", "Reject"]),
      reason: z.string().max(500).optional(),
    })
    .refine((b) => b.action !== "Reject" || !!b.reason?.trim(), {
      message: "A reason is required when rejecting a drop",
      path: ["reason"],
    }),
});

const AdminModerationValidations = {
  idValidation: idParamSchema(),
  reportsListValidation,
  resolveReportValidation,
  reviewsListValidation,
  dropsListValidation,
  reviewDropValidation,
};

export default AdminModerationValidations;
