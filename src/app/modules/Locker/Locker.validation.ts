import { z } from "zod";

const toggleItemPrivacyValidation = z.object({
  params: z.object({
    id: z.string().min(24, "Valid 24-character Locker Item ID required"),
  }),
  body: z.object({
    isPublic: z.boolean().or(z.enum(["true", "false"])),
  }),
});

const toggleCollectionPrivacyValidation = z.object({
  body: z.object({
    isPublic: z.boolean().or(z.enum(["true", "false"])),
  }),
});

const communityQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
    city: z.string().optional(),
    brand: z.string().optional(),
    size: z.string().optional(),
  }),
});

const collectorParamValidation = z.object({
  params: z.object({
    buyerId: z.string().min(24, "Valid 24-character Buyer ID required"),
  }),
});

const LockerValidations = {
  toggleItemPrivacyValidation,
  toggleCollectionPrivacyValidation,
  communityQueryValidation,
  collectorParamValidation,
};

export default LockerValidations;

