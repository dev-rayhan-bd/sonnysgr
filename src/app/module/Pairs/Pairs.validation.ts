import { z } from "zod";


const VariantSchema = z.object({
  gender: z.enum(["Men", "Women", "Kids"]),
  size: z.string().min(1, "Size is required"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
});

export const CreateProductSchema = z.object({
  variant: z
    .array(VariantSchema)
    .min(1, "At least one variant is required"),
});

const addnewPairValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required"),
        type: z.string().min(1, "Pair type is required."),
        brand: z.string().min(1, "Brand is required"),
        styleCode: z.string().min(1, "Style code is required"),
        details: z.string().optional(),
        variant: z.array(VariantSchema).min(1, "At least 1 value is required"),
        askingPrice: z.coerce.number().min(0, "Asking price must be a positive number"),
        condition: z.enum(["New", "Never worn", "Worn once", "Worn few times", "Used - Good condition", "Used - Fair condition"]).optional(),
        isVisibleToStore: z.boolean().optional(),
        isShowAskingPrice: z.boolean().optional(),
        isAllowDirectRequest: z.boolean().optional(),
    }),
});

const makeRequestForPairValidationSchema = z.object({
    body: z.object({
        pairId: z.string().min(24, "Pair ID is required"),
        quantity: z.number().min(1, "Quantity is required").optional(),
        variant: z.object({
            gender: z.string().min(1, "Gender is required"),
            size: z.number().min(0, "Size must be a positive number")
        }).optional(),
        askingPrice: z.number().min(1, "Asking price must be a positive number").optional(),
        offerPrice: z.number().min(1, "Offer price must be a positive number"),
        validityHours: z.number().min(1, "Validity hours is required"),
        note: z.string().optional(),
        dealCompletionType: z.enum(["Meetup", "Store dropoff","Shipping","Direct"]).optional(),
    }),
});



const PairsValidations = { 
    addnewPairValidationSchema,
    makeRequestForPairValidationSchema
 };

export default PairsValidations;