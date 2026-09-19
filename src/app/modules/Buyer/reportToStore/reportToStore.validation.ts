import { z } from "zod";

const createReportValidationSchema = z.object({
  body: z.object({
    retailerId: z.string().min(24, "Retailer ID is required."),
    orderId: z.preprocess(
      (val) => (val === "" || val === "null" || val === "undefined" ? undefined : val),
      z.string().min(24, "Invalid Order ID format.").optional().nullable()
    ),
    title: z.enum([
      "Fake or Counterfeit Product",
      "Fraud or Scam",
      "Wrong Item Received",
      "Item Misrepresented",
      "Staff or Service Issue",
      "Other Issue"
    ]),
    content: z.string().min(1, "Report description is required.").max(1000, "Description cannot exceed 1000 characters."),
    contactMethod: z.enum(["Email", "In-App"]).optional(),
    isUrgent: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          return val.toLowerCase() === "true";
        }
        return val;
      },
      z.boolean().optional()
    ),
  }),
});

export const ReportToStoreValidations = {
  createReportValidationSchema,
};

export default ReportToStoreValidations;
