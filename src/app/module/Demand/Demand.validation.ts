import { z } from "zod";

const localDemandQuerySchema = z.object({
  query: z.object({
    radius: z.preprocess(
      (val) => (val ? Number(val) : 10),
      z.number().min(0.1).max(500)
    ).default(10), // in miles
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

const sizeDemandQuerySchema = z.object({
  query: z.object({
    radius: z.preprocess(
      (val) => (val ? Number(val) : 10),
      z.number().min(0.1).max(500)
    ).default(10), // in miles
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

const demandGapsQuerySchema = z.object({
  query: z.object({
    radius: z.preprocess(
      (val) => (val ? Number(val) : 10),
      z.number().min(0.1).max(500)
    ).default(10), // in miles
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
