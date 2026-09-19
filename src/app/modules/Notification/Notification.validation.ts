import { z } from "zod";

export const updateNotificationData = z.object({
    body: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
    }),
});

const NotificationValidations = { updateNotificationData };

export default NotificationValidations;