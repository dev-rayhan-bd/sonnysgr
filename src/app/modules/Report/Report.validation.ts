import { z } from "zod";

   

const addReportValidationSchema = z.object({
    body: z.object({
        retailerId: z.string().min(24,"Buyer id is required."),
        orderId: z.string().min(24,"Buyer id is required.").optional(),
        title: z.string().min(1,"Report title is required."),
        content: z.string().min(1,"Report content is required."),
        resolution: z.string().min(1,"Report content is required.").optional(),
        contactMethod: z.string().min(1,"Report contacr method is required.").optional(),
        isUrgent: z.boolean().optional(),
       
    }),
});

const ReportValidations = { 
    addReportValidationSchema
 };

export default ReportValidations;