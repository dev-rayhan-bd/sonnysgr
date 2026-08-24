import { z } from "zod";

const createOrderPaymentValidationSchema = z.object({
  body: z.object({
    orderId: z.string().min(24, "Invalid Order ID format."),
    buyerId: z.string().min(24, "Invalid Buyer ID format."),
    amount: z.number().min(0, "Amount must be a positive number."),
    gateway: z.enum(["STRIPE", "SSL_COMMERZ", "BKASH", "COD"]),
    transactionId: z.string().min(1, "Transaction ID is required."),
    status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
  }),
});

export const OrderPaymentValidations = {
  createOrderPaymentValidationSchema,
};

export default OrderPaymentValidations;
