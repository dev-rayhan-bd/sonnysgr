import { z } from "zod";
import { STORE_SETTINGS_LIMITS } from "./Retailer.constant";

        
const validateLatLongTofilterNearbyRetailers = z.object({
    query: z.object({
            latitude: z.coerce
                .number()
                .refine((value) => value >= -90 && value <= 90, {
                     message: "Latitude must be between -90 and 90",
                }),
        // .optional(),

            longitude: z.coerce
            .number()
            .refine((value) => value >= -180 && value <= 180, {
                message: "Longitude must be between -180 and 180",
            })
    }),
});

const addNewBranchValidationSchema = z.object({
    body: z.object({
        latitude: z.coerce
            .number()
            .refine((value) => value >= -90 && value <= 90, {
                    message: "Latitude must be between -90 and 90",
            }),
    // .optional(),

        longitude: z.coerce
        .number()
        .refine((value) => value >= -180 && value <= 180, {
            message: "Longitude must be between -180 and 180",
        }),
        address: z.string().min(1,"Formal address is required."),
        phone: z.string().min(1,"Phone number is required."),
        name: z.string().min(1,"Branch name is required."),
    
        
    }),
});

const addVerificationInfoValidationSchema = z.object({
    body: z.object({
        latitude: z.coerce
            .number()
            .refine((value) => value >= -90 && value <= 90, {
                    message: "Latitude must be between -90 and 90",
            }),
    // .optional(),

        longitude: z.coerce
        .number()
        .refine((value) => value >= -180 && value <= 180, {
            message: "Longitude must be between -180 and 180",
        }),
        address: z.string().min(1,"Formal address is required."),
        // phone: z.string().min(1,"Phone number is required."),
        // name: z.string().min(1,"Branch name is required."),
    
        
    }),
}); 



const completeRetailerProfileValidation = z.object({
    body: z.object({
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
        email: z.string().email().optional(),
    }),
});

const getRetailerInventoryValidationSchema = z.object({
    query: z.object({
        availability: z.string().optional(),
        type: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
    }),
});

const settingNumber = (limits: { min: number; max: number }, label: string) =>
    z.coerce
        .number({ error: `${label} must be a number.` })
        .int(`${label} must be a whole number.`)
        .min(limits.min, `${label} must be at least ${limits.min}.`)
        .max(limits.max, `${label} must be at most ${limits.max}.`)
        .optional();

// Store operation settings (prep time, hold duration, pickup window, service radius)
const updateStoreSettingsValidationSchema = z.object({
    body: z
        .object({
            prepTimeMinutes: settingNumber(STORE_SETTINGS_LIMITS.prepTimeMinutes, "Prep time (minutes)"),
            holdDurationHours: settingNumber(STORE_SETTINGS_LIMITS.holdDurationHours, "Hold duration (hours)"),
            pickupWindowHours: settingNumber(STORE_SETTINGS_LIMITS.pickupWindowHours, "Pickup window (hours)"),
            serviceRadiusMiles: settingNumber(STORE_SETTINGS_LIMITS.serviceRadiusMiles, "Service radius (miles)"),
        })
        .strict()
        .refine((body) => Object.values(body).some((value) => value !== undefined), {
            message: "Provide at least one setting to update.",
        }),
});

const RetailerValidations = {
    validateLatLongTofilterNearbyRetailers ,
    updateStoreSettingsValidationSchema,
    addNewBranchValidationSchema,
    addVerificationInfoValidationSchema,
    completeRetailerProfileValidation,
    getRetailerInventoryValidationSchema
};

export default RetailerValidations;