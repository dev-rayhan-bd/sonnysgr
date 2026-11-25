import { z } from "zod";

const localDemandQuerySchema = z.object({
  query: z.object({
    // in miles; omitted -> the store's configured service radius
    radius: z.coerce.number().min(0.1).max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

const sizeDemandQuerySchema = z.object({
  query: z.object({
    // in miles; omitted -> the store's configured service radius
    radius: z.coerce.number().min(0.1).max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

const demandGapsQuerySchema = z.object({
  query: z.object({
    // in miles; omitted -> the store's configured service radius
    radius: z.coerce.number().min(0.1).max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const DemandValidations = {
  localDemandQuerySchema,
  sizeDemandQuerySchema,
  demandGapsQuerySchema,
};
export default DemandValidations;
