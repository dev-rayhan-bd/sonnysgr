import { z } from "zod";
import { dateRangeQuery } from "../dashboard.shared";

/** GET /analytics/gmv — time series. */
const gmvQueryValidation = z.object({
  query: z.object({
    ...dateRangeQuery,
    interval: z.enum(["day", "month"]).optional(),
  }),
});

/** GET /analytics/commission — totals only. */
const commissionQueryValidation = z.object({
  query: z.object({ ...dateRangeQuery }),
});

/** Top-N rankings (cities, brands, stores, resellers). */
const rankingQueryValidation = z.object({
  query: z.object({
    ...dateRangeQuery,
    limit: z.coerce.number().int().positive().max(50).optional(),
  }),
});

const AdminAnalyticsValidations = { gmvQueryValidation, commissionQueryValidation, rankingQueryValidation };

export default AdminAnalyticsValidations;
