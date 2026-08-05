import { z } from "zod";

        
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

const RetailerValidations = { 
    validateLatLongTofilterNearbyRetailers ,
    addNewBranchValidationSchema,
    addVerificationInfoValidationSchema,
    completeRetailerProfileValidation,
    getRetailerInventoryValidationSchema
};

export default RetailerValidations;