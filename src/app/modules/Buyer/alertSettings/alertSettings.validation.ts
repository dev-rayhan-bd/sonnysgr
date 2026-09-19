import { z } from "zod";

const updateGlobalAlertsSchema = z.object({
  body: z.object({
    newArrivals: z.boolean().optional(),
    exclusiveDrops: z.boolean().optional(),
    flashSales: z.boolean().optional(),
    restocks: z.boolean().optional(),
    quietHours: z.object({
      active: z.boolean().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
  }),
});

const updateStoreAlertsSchema = z.object({
  body: z.object({
    newArrivals: z.boolean().optional(),
    exclusiveDrops: z.boolean().optional(),
    flashSales: z.boolean().optional(),
    restocks: z.boolean().optional(),
    isCustomized: z.boolean().optional(),
  }),
});

export const AlertSettingsValidations = {
  updateGlobalAlertsSchema,
  updateStoreAlertsSchema,
};
export default AlertSettingsValidations;
