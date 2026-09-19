import { z } from "zod";

const createTicketValidationSchema = z.object({
  body: z.object({
    category: z.enum(["Order Issue", "Refund/Dispute", "Hold Problem", "Pickup Issue", "Something else"]),
    orderId: z.string().optional(),
    description: z.string().min(1).max(1000),
    attachments: z.array(z.string()).optional(),
    desiredResolution: z.enum(["Full refund", "Partial refund", "Store credit", "Just want it resolved"]),
    isTimeSensitive: z.boolean().optional(),
  }),
});

const resolveTicketValidationSchema = z.object({
  body: z.object({
    status: z.enum(["Resolved", "Rejected"]),
    resolutionDetails: z.string().min(1),
    refundAmount: z.number().optional(),
  }),
});

const SupportValidations = {
  createTicketValidationSchema,
  resolveTicketValidationSchema,
};

export default SupportValidations;
