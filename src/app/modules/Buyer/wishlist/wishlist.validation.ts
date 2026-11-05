import { z } from "zod";

const addToWishlistValidation = z.object({
  body: z.object({
    productId: z.string().min(1, "productId is required"),
    desiredSize: z.union([z.string(), z.number()]).optional(),
    notifyOnRestock: z.boolean().optional(),
    notifyOnPriceDrop: z.boolean().optional(),
    targetPrice: z.number().optional(),
  }),
});

const toggleWantedGrailValidation = z.object({
  body: z.object({
    productId: z.string().min(1, "productId is required"),
    isWanted: z.boolean().optional(),
    desiredSize: z.union([z.string(), z.number()]).optional(),
  }),
});

const WishlistValidations = {
  addToWishlistValidation,
  toggleWantedGrailValidation,
};

export default WishlistValidations;
