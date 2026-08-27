import { z } from "zod";

const toggleTrustValidation = z.object({
  body: z.object({
    resellerId: z.string().min(1, "Reseller ID is required"),
  }),
});

const createSourcingRequestValidation = z.object({
  body: z.object({
    resellerId: z.string().min(1, "Reseller ID is required"),
    pairId: z.string().min(1, "Pair ID is required"),
    variant: z.object({
      gender: z.enum(["Men", "Women", "Kids"]),
      size: z.string().min(1, "Size is required"),
      quantity: z
        .number()
        .int()
        .min(1, "Quantity must be at least 1"),
    }),
  }),
});

const respondSourcingRequestValidation = z
  .object({
    body: z.object({
      status: z.enum(["Accepted", "Rejected"]),
      rejectionReason: z.string().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.body.status === "Rejected" && (!data.body.rejectionReason || data.body.rejectionReason.trim() === "")) {
      ctx.addIssue({
        code: "custom",
        message: "Rejection reason is required when rejecting a sourcing request",
        path: ["body", "rejectionReason"],
      });
    }
  });

const SourcingValidations = {
  toggleTrustValidation,
  createSourcingRequestValidation,
  respondSourcingRequestValidation,
};

export default SourcingValidations;
