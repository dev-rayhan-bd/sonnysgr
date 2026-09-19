import { z } from "zod";

const operationHourValidationSchema = z.object({
  day: z.string().min(1, "Day is required."),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  isOpen: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
});

const addNewBranchValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Branch name is required."),
    phone: z.string().min(1, "Phone number is required."),
    address: z.string().min(1, "Address is required."),
    latitude: z.coerce
      .number()
      .refine((value) => value >= -90 && value <= 90, {
        message: "Latitude must be between -90 and 90",
      }),
    longitude: z.coerce
      .number()
      .refine((value) => value >= -180 && value <= 180, {
        message: "Longitude must be between -180 and 180",
      }),
    inventoryType: z.enum(["SHARED", "SEPARATE"]).optional(),
    pickupRules: z.string().optional(),
    isAcceptInAppOrder: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    isAcceptInHoldWithDeposit: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    isInStorePickupAvailable: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    operationHours: z.preprocess(
      (val) => (typeof val === "string" ? JSON.parse(val) : val),
      z.array(operationHourValidationSchema)
    ).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  }),
});

const updateBranchValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    latitude: z.coerce
      .number()
      .refine((value) => value >= -90 && value <= 90, {
        message: "Latitude must be between -90 and 90",
      })
      .optional(),
    longitude: z.coerce
      .number()
      .refine((value) => value >= -180 && value <= 180, {
        message: "Longitude must be between -180 and 180",
      })
      .optional(),
    inventoryType: z.enum(["SHARED", "SEPARATE"]).optional(),
    pickupRules: z.string().optional(),
    isAcceptInAppOrder: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    isAcceptInHoldWithDeposit: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    isInStorePickupAvailable: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    operationHours: z.preprocess(
      (val) => (typeof val === "string" ? JSON.parse(val) : val),
      z.array(operationHourValidationSchema)
    ).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  }),
});

export const BranchValidations = {
  addNewBranchValidationSchema,
  updateBranchValidationSchema,
};
