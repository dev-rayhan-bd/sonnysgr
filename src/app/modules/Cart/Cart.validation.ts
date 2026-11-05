import { z } from "zod";

const addToCartValidation = z.object({
  body: z.object({
    productId: z.string().min(1, "productId is required"),
    variantId: z.string().optional(),
    selectedSize: z.union([z.string(), z.number()]),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
  }),
});

const updateCartItemQuantityValidation = z.object({
  body: z.object({
    cartItemId: z.string().min(1, "cartItemId is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
    selectedSize: z.union([z.string(), z.number()]).optional(),
  }),
});

const applyPromoCodeValidation = z.object({
  body: z.object({
    promoCode: z.string().min(1, "promoCode is required"),
    retailerId: z.string().optional(),
  }),
});

const checkoutCartValidation = z.object({
  body: z.object({
    fulfillmentType: z.enum(["DELIVERY", "STORE_PICKUP"]).default("DELIVERY"),
    pickupTime: z.string().datetime().optional(),
    paymentMethod: z.string().default("CARD"),
    promoCode: z.string().optional(),
    notes: z.string().optional(),
    shippingAddress: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        area: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
      .optional(),
  }),
});

const CartValidations = {
  addToCartValidation,
  updateCartItemQuantityValidation,
  applyPromoCodeValidation,
  checkoutCartValidation,
};

export default CartValidations;
