import express from "express";
import { auth } from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import WishlistValidations from "./wishlist.validation";
import WishlistController from "./wishlist.controller";

const WishlistRouter = express.Router();

WishlistRouter.post(
  "/add",
  auth(["Buyer"]),
  validateRequest(WishlistValidations.addToWishlistSchema),
  WishlistController.addToWishlist
);

WishlistRouter.delete(
  "/remove/:productId",
  auth(["Buyer"]),
  WishlistController.removeFromWishlist
);

WishlistRouter.get(
  "/",
  auth(["Buyer"]),
  WishlistController.getWishlist
);

export default WishlistRouter;
