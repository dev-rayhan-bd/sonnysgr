import { z } from "zod";

const toggleTrustValidation = z.object({
  body: z.object({
    resellerId: z.string().min(1, "Reseller ID is required"),
  }),
});

const SourcingValidations = {
  toggleTrustValidation,
};

export default SourcingValidations;
