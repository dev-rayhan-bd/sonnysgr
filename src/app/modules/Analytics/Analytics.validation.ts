import { z } from "zod";

const rangeEnum = z.enum(["7d", "30d", "90d", "12m"]);

const storeOverviewValidationSchema = z.object({
  query: z.object({
    range: rangeEnum.optional(),
  }),
});

const topProductsValidationSchema = z.object({
  query: z.object({
    range: rangeEnum.optional(),
    sort: z.enum(["-views", "-unitsSold", "-revenue", "-turnoverRate"]).optional(),
    searchTerm: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const AnalyticsValidations = {
  storeOverviewValidationSchema,
  topProductsValidationSchema,
};

export default AnalyticsValidations;
