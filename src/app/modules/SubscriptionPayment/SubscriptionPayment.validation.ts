import { z } from "zod";
import {
  STORE_PLAN_LIMITS,
  STORE_PLAN_PURCHASE_STATUS,
  STORE_PLAN_TYPE,
} from "./SubscriptionPayment.constant";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id.");
const planTypeEnum = z.enum([STORE_PLAN_TYPE.SUBSCRIPTION, STORE_PLAN_TYPE.BOOST]);

const planBody = {
  title: z.string().trim().min(1, "Title is required.").max(120),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().min(STORE_PLAN_LIMITS.minPrice).max(STORE_PLAN_LIMITS.maxPrice),
  durationDays: z.coerce
    .number()
    .int()
    .min(STORE_PLAN_LIMITS.minDurationDays)
    .max(STORE_PLAN_LIMITS.maxDurationDays),
  features: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  isActive: z.boolean().optional(),
};

const createPlanValidationSchema = z.object({
  body: z.object({ planType: planTypeEnum, ...planBody }).strict(),
});

const updatePlanValidationSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      title: planBody.title.optional(),
      description: planBody.description,
      price: planBody.price.optional(),
      durationDays: planBody.durationDays.optional(),
      features: planBody.features,
      isActive: planBody.isActive,
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one field to update.",
    }),
});

const planIdParamValidationSchema = z.object({
  params: z.object({ id: objectId }),
});

const getPlansValidationSchema = z.object({
  query: z.object({
    planType: planTypeEnum.optional(),
    isActive: z.enum(["true", "false"]).optional(),
    searchTerm: z.string().optional(),
    sort: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const checkoutValidationSchema = z.object({
  body: z
    .object({
      planId: objectId,
      // optional deep-link / web redirect overrides for Stripe Checkout
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    })
    .strict(),
});

const purchaseHistoryValidationSchema = z.object({
  query: z.object({
    planType: planTypeEnum.optional(),
    status: z
      .enum([
        STORE_PLAN_PURCHASE_STATUS.PENDING,
        STORE_PLAN_PURCHASE_STATUS.PAID,
        STORE_PLAN_PURCHASE_STATUS.FAILED,
        STORE_PLAN_PURCHASE_STATUS.EXPIRED,
      ])
      .optional(),
    sort: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const SubscriptionPaymentValidations = {
  createPlanValidationSchema,
  updatePlanValidationSchema,
  planIdParamValidationSchema,
  getPlansValidationSchema,
  checkoutValidationSchema,
  purchaseHistoryValidationSchema,
};

export default SubscriptionPaymentValidations;
