import { z } from "zod";

const addToFollowingSchema = z.object({
  body: z.object({
    productId: z.string().min(1, "Product ID is required"),
  }),
});

export const FollowingValidations = {
  addToFollowingSchema,
};
export default FollowingValidations;
