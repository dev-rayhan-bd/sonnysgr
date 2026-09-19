import { z } from "zod";

        
const addToWishListValidation = z.object({
    query: z.object({
        productId: z.string().length(24, "Invalid product ID"),
        retailerId: z.string().length(24, "Invalid retailer ID")
    }),
});

const validateLatLongTofilterNearbyUsers = z.object({
    query: z.object({
            latitude: z
                .number()
                .refine((value) => value >= -90 && value <= 90, {
                     message: "Latitude must be between -90 and 90",
                }),
        // .optional(),

            longitude: z
            .number()
            .refine((value) => value >= -180 && value <= 180, {
                message: "Longitude must be between -180 and 180",
            })
    }),
});

const EngagementValidations = { 
    addToWishListValidation ,
    validateLatLongTofilterNearbyUsers
};

export default EngagementValidations;