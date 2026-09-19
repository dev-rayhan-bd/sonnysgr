import { z } from "zod";

const helpAndSupportValidation = z.object({
    body: z.object({
        phone: z.string().min(1, "phone is required"),
        email: z.string().trim().email("Invalid email address").transform((val) => val.toLowerCase()),
        description: z.string().min(1, "Description is required")
        
    })
});

const settingsValidationSchema = z.object({
    body: z.object({
        description: z.string().min(1, "Description is required to update")    
    }),
});

const faqValidationSchema = z.object({
    body: z.object({
        question: z.string().min(1, "Question is required"),    
        answer: z.string().min(1, "Answer is required to update"),    
    }),
});

const editFaqValidationSchema = z.object({
    body: z.object({
        question: z.string().min(1, "Question is required").optional(),    
        answer: z.string().min(1, "Answer is required to update").optional(),    
    }),
});

const SettingsValidations = { 
    helpAndSupportValidation,
    settingsValidationSchema,
    faqValidationSchema,
    editFaqValidationSchema
};

export default SettingsValidations;