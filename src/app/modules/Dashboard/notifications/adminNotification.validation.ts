import { z } from "zod";
import { idParamSchema } from "../dashboard.shared";

const sendNotificationValidation = z.object({
  body: z.object({
    userId: z.string().regex(/^[a-f\d]{24}$/i, "userId must be the account _id from /dashboard/users/get-all-users"),
    title: z.string().min(1, "Title is required").max(120),
    description: z.string().min(1, "Message is required").max(1000),
  }),
});

const adminNotificationsListValidation = z.object({
  query: z.object({
    isSeen: z.enum(["true", "false"]).optional(),
    type: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort: z.string().optional(),
  }),
});

const AdminNotificationValidations = {
  sendNotificationValidation,
  adminNotificationsListValidation,
  idValidation: idParamSchema(),
};

export default AdminNotificationValidations;
