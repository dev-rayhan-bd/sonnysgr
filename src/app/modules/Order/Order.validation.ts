import { z } from "zod";

        
const u = z.object({
    body: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
    }),
});

// Scanned QR value (GS-PICKUP-123456) or the 6 digits typed by hand
const verifyPickupValidation = z.object({
    body: z.object({
        pickupVerificationCode: z
            .string()
            .trim()
            // GS-HOLD codes pass so the service can point the retailer to /order/settle-hold
            .regex(/^(GS-(PICKUP|HOLD)-)?\d{6}$/i, "Enter the 6-digit pickup code or scan the buyer's QR code"),
    }),
});

const OrderValidations = { u, verifyPickupValidation };

export default OrderValidations;