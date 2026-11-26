import { z } from "zod";
import { dateRangeQuery, idParamSchema } from "../dashboard.shared";

const listQuery = {
  ...dateRangeQuery,
  searchTerm: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
};

const transactionsValidation = z.object({
  query: z.object({
    ...listQuery,
    status: z
      .enum(["PENDING", "SUCCESS", "FAILED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED"])
      .optional(),
    paymentType: z.enum(["ORDER", "HOLD_DEPOSIT"]).optional(),
    gateway: z.enum(["STRIPE"]).optional(),
  }),
});

const refundsValidation = z.object({
  query: z.object({
    ...listQuery,
    status: z.enum(["Open", "In Progress", "Escalated", "Resolved", "Rejected"]).optional(),
  }),
});

const payoutsValidation = z.object({
  query: z.object({
    ...listQuery,
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "REJECTED"]).optional(),
    payoutMethod: z.enum(["Bank", "Stripe", "StoreCash"]).optional(),
    retailerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  }),
});

const processPayoutValidation = idParamSchema().extend({
  body: z.object({
    status: z.enum(["PROCESSING", "COMPLETED", "REJECTED"]),
    transactionReference: z.string().optional(),
    adminNote: z.string().optional(),
  }),
});

const AdminFinanceValidations = {
  transactionsValidation,
  refundsValidation,
  payoutsValidation,
  processPayoutValidation,
};

export default AdminFinanceValidations;
