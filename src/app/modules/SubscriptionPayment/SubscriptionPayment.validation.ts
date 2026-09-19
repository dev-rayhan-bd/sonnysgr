import { z } from "zod";

const createSubscriptionValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const SubscriptionPaymentValidations = {
  createSubscriptionValidationSchema,
};

export default SubscriptionPaymentValidations;
