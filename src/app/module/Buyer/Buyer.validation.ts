import { z } from "zod";

        
const getBuyerNearbyProductValidation = z.object({
    query: z.object({
        productType: z.string().optional(),
        latitude: z
            .number()
            .refine((value) => value >= -90 && value <= 90, {
                    message: "Latitude must be between -90 and 90",
            }),
            //.optional(),

        longitude: z
        .number()
        .refine((value) => value >= -180 && value <= 180, {
            message: "Longitude must be between -180 and 180",
        })
    }),
});

const completeBuyerProfileValidation = z.object({
    body: z.object({
        latitude: z
            .number()
            .refine((value) => value >= -90 && value <= 90, {
                message: "Latitude must be between -90 and 90",
            }),
        longitude: z
            .number()
            .refine((value) => value >= -180 && value <= 180, {
                message: "Longitude must be between -180 and 180",
            }),
        shoosize: z.number(),
        type: z.enum(["man", "woman", "kid", ""]),
        nearbystores: z.array(z.string()),
        notficationprefernce: z.object({
            isRestockInMyShoeSize: z.boolean(),
            isNearbyStoreAlert: z.boolean(),
            isFollowStoreDrops: z.boolean(),
            isPriceDrop: z.boolean(),
            isWantedPairAlert: z.boolean(),
            isGoSneakerAnnouncement: z.boolean(),
        }),
        barnads: z.array(z.string()),
        email: z.string().email().optional(),
    }),
});

const BuyerValidations = { 
    getBuyerNearbyProductValidation,
    completeBuyerProfileValidation
 };

export default BuyerValidations;