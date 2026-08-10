import { z } from "zod";

const addToWishlistSchema = z.object({
  body: z.object({
    productId: z.string().min(1, "Product ID is required"),
  }),
});

export const WishlistValidations = {
  addToWishlistSchema,
};
export default WishlistValidations;
