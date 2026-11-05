import { z } from "zod";

const makeRequestForPairValidationSchema = z.object({
  body: z.object({
    pairId: z.string().min(24, "Pair ID is required"),
    quantity: z.number().min(1, "Quantity is required").optional(),
    variant: z
      .object({
        gender: z.string().min(1, "Gender is required"),
        size: z.string().or(z.number()),
      })
      .optional(),
    askingPrice: z.number().min(1, "Asking price must be a positive number").optional(),
    offerPrice: z.number().min(1, "Offer price must be a positive number"),
    validityHours: z.number().min(1, "Validity hours is required"),
    note: z.string().optional(),
    dealCompletionType: z.enum(["Immediate", "Negotiable"]).optional(),
  }),
});

const updateVisibilityControlsValidationSchema = z.object({
  body: z.object({
    isProfilePublic: z.boolean().optional(),
    showListings: z.boolean().optional(),
    showPrices: z.boolean().optional(),
    approximateLocation: z.boolean().optional(),
    onlineStatus: z.boolean().optional(),
  }),
});

const updateResellerProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    storeName: z.string().optional(),
    bio: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    latitude: z.string().or(z.number()).optional(),
    longitude: z.string().or(z.number()).optional(),
    socialLink: z.record(z.string(), z.string()).optional(),
    operationHour: z.record(z.string(), z.string()).optional(),
  }),
});

const ResellerValidations = {
  makeRequestForPairValidationSchema,
  updateVisibilityControlsValidationSchema,
  updateResellerProfileValidationSchema,
};

export default ResellerValidations;
