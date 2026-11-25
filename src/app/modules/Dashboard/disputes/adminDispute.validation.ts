import { z } from "zod";
import { dateRangeQuery, idParamSchema } from "../dashboard.shared";
import SupportValidations from "../../Support/Support.validation";

const disputesListValidation = z.object({
  query: z.object({
    ...dateRangeQuery,
    status: z.enum(["Open", "In Progress", "Escalated", "Resolved", "Rejected"]).optional(),
    category: z.enum(["Order Issue", "Refund/Dispute", "Hold Problem", "Pickup Issue", "Something else"]).optional(),
    isTimeSensitive: z.enum(["true", "false"]).optional(),
    isEscalated: z.enum(["true", "false"]).optional(),
    searchTerm: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort: z.string().optional(),
  }),
});

const resolveDisputeValidation = idParamSchema().extend({
  body: SupportValidations.resolveTicketValidationSchema.shape.body,
});

const escalateDisputeValidation = idParamSchema().extend({
  body: z.object({
    note: z.string().min(1, "Escalation note is required").max(1000),
  }),
});

const AdminDisputeValidations = {
  disputesListValidation,
  disputeIdValidation: idParamSchema(),
  resolveDisputeValidation,
  escalateDisputeValidation,
};

export default AdminDisputeValidations;
