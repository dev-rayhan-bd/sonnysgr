import { z } from "zod";

const toggleTrustValidation = z.object({
  body: z.object({
    resellerId: z.string().min(1, "Reseller ID is required"),
  }),
});

const createSourcingRequestValidation = z.object({
  body: z.object({
    brand: z.string().min(1, "Brand is required"),
    modelName: z.string().min(1, "Sneaker model name is required"),
    colorway: z.string().optional(),
    size: z.string().min(1, "Size is required"),
    maxBudget: z.number().positive("Max budget must be a positive number"),
    notes: z.string().optional(),
    images: z.array(z.string()).optional(),
    coordinates: z.array(z.number()).length(2).optional(),
    durationDays: z.number().int().min(1).max(30).optional(),
  }),
});

const communityDemandQueryValidation = z.object({
  query: z.object({
    radius: z.string().optional(),
    brand: z.string().optional(),
    size: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const respondToSourcingRequestValidation = z.object({
  params: z.object({
    id: z.string().min(24, "Valid 24-character Sourcing Request ID required"),
  }),
  body: z.object({
    quotedPrice: z.number().positive("Quoted price must be positive"),
    inStockNow: z.boolean().default(true),
    notes: z.string().optional(),
    matchedProductId: z.string().min(24).optional(),
  }),
});

const SourcingValidations = {
  toggleTrustValidation,
  createSourcingRequestValidation,
  communityDemandQueryValidation,
  respondToSourcingRequestValidation,
};

export default SourcingValidations;
