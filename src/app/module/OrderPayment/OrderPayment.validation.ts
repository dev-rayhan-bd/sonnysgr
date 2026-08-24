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

const placeOrderValidationSchema = z.object({
  body: z.object({
    shippingAddress: z.object({
      name: z.string().min(1, "Name is required."),
      phone: z.string().min(1, "Phone number is required."),
      email: z.string().email("Invalid email format.").optional().nullable().or(z.literal("")),
      address: z.string().min(1, "Address is required."),
    }),
    orderItems: z.array(
      z.object({
        productId: z.string().min(24, "Invalid Product ID format."),
        variantId: z.string().min(24, "Invalid Variant ID format."),
        quantity: z.number().int().min(1, "Quantity must be at least 1."),
        price: z.number().min(0, "Price must be a non-negative number."),
        selectedSize: z.preprocess(
          (val) => (typeof val === "string" ? parseFloat(val) : val),
          z.number().min(1, "Selected size is required.")
        ),
      })
    ).min(1, "At least one item is required in the order."),
  }),
});

export const OrderPaymentValidations = {
  createOrderPaymentValidationSchema,
  placeOrderValidationSchema,
};

export default OrderPaymentValidations;
