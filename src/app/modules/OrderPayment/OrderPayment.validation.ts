import { z } from "zod";
import { ORDER_PAYMENT_STATUS, ORDER_PAYMENT_TYPE } from "./OrderPayment.constant";

const objectId = (label: string) => z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${label} format.`);

/** Shoe sizes arrive as "10.5" or 10.5; stored as a string on the variant. */
const sizeSchema = z.union([z.string().trim().min(1), z.number().positive()], {
  error: "Selected size is required.",
});

const shippingAddressSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone number is required."),
  email: z.string().email("Invalid email format.").optional().nullable().or(z.literal("")),
  address: z.string().trim().min(1, "Address is required."),
});

/** Optional deep links back into the app after Stripe. Must be absolute URLs. */
export const checkoutRedirectSchema = {
  successUrl: z.string().url("successUrl must be a full URL.").optional(),
  cancelUrl: z.string().url("cancelUrl must be a full URL.").optional(),
};

const placeOrderValidationSchema = z.object({
  body: z.object({
    shippingAddress: shippingAddressSchema,
    orderItems: z
      .array(
        z.object({
          productId: objectId("Product ID"),
          variantId: z.string().optional(),
          quantity: z.number().int().min(1, "Quantity must be at least 1.").max(20, "Max 20 per item."),
          // Ignored: the server always charges the database price. Accepted for backward compatibility.
          price: z.number().optional(),
          selectedSize: sizeSchema,
        })
      )
      .min(1, "At least one item is required in the order.")
      .max(50, "Too many items in one order."),
    ...checkoutRedirectSchema,
  }),
});

const buyNowValidationSchema = z.object({
  body: z.object({
    productId: objectId("Product ID"),
    retailerId: objectId("Retailer ID").optional(),
    selectedSize: sizeSchema,
    quantity: z.number().int().min(1).max(20).optional(),
    shippingAddress: shippingAddressSchema.optional(),
    // Ignored (server price is used); accepted so older app builds still validate
    unitPrice: z.number().optional(),
    ...checkoutRedirectSchema,
  }),
});

const holdDepositValidationSchema = z.object({
  body: z.object({
    retailerId: objectId("Retailer ID").optional(),
    productId: objectId("Product ID"),
    selectedSize: sizeSchema,
    quantity: z.number().int().min(1).max(5).optional(),
    holdingTimeHours: z.number().positive().max(72).optional(),
    // Buyer may pay more than the minimum deposit, never less. Legacy name accepted too.
    depositAmount: z.number().positive().optional(),
    partialDepositAmount: z.number().positive().optional(),
    unitPrice: z.number().optional(),
    ...checkoutRedirectSchema,
  }),
});

const paymentStatusValidationSchema = z.object({
  params: z.object({ orderId: objectId("order id") }),
});

const myPaymentsValidationSchema = z.object({
  query: z.object({
    status: z.enum(Object.values(ORDER_PAYMENT_STATUS) as [string, ...string[]]).optional(),
    paymentType: z.enum(Object.values(ORDER_PAYMENT_TYPE) as [string, ...string[]]).optional(),
    searchTerm: z.string().optional(),
    sort: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const OrderPaymentValidations = {
  placeOrderValidationSchema,
  buyNowValidationSchema,
  holdDepositValidationSchema,
  paymentStatusValidationSchema,
  myPaymentsValidationSchema,
};

export default OrderPaymentValidations;
