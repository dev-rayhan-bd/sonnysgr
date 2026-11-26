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

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const cancelOrderValidation = z.object({
    params: z.object({ orderId: z.string().regex(objectIdRegex, "Invalid order ID format.") }),
    body: z.object({ reason: z.string().trim().max(500).optional() }).optional(),
});

const retailerCancelValidation = z.object({
    params: z.object({ id: z.string().regex(objectIdRegex, "Invalid order item ID format.") }),
    body: z.object({ reason: z.string().trim().max(500).optional() }).optional(),
});

const settleHoldValidation = z.object({
    body: z
        .object({
            orderId: z.string().regex(objectIdRegex, "Invalid order ID format.").optional(),
            pickupVerificationCode: z.string().trim().min(6).optional(),
            paymentMethod: z.enum(["IN_STORE_CASH", "IN_STORE_CARD"]).optional(),
        })
        .refine((b) => b.orderId || b.pickupVerificationCode, "orderId or pickupVerificationCode is required."),
});

const orderItemIdParamValidation = z.object({
    params: z.object({ id: z.string().regex(objectIdRegex, "Invalid order item ID format.") }),
});

const OrderValidations = {
    u,
    verifyPickupValidation,
    cancelOrderValidation,
    retailerCancelValidation,
    settleHoldValidation,
    orderItemIdParamValidation,
};

export default OrderValidations;