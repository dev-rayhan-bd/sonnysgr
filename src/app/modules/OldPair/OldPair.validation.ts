import { z } from "zod";

        
const addOldPairValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1,"Name is required"),
        details: z.string().min(1,"details is required").optional,
        price: z.number().min(1,"price is required"),
        brand: z.string().min(1,"Brand is required"),
        size: z.string().min(1,"Size is required"),
        condition: z.string().min(1,"Condition is required"),
        isVisible: z.boolean(),
        visiblityDistance: z.number().min(1, "distance is required")
    }),
});

const OldPairValidations = { 
    addOldPairValidationSchema
 };

export default OldPairValidations;