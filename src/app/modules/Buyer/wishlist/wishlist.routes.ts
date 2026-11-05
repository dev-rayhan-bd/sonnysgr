import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import WishlistValidations from "./wishlist.validation";
import WishlistController from "./wishlist.controller";

const WishlistRouter = express.Router();

// 1. Get Buyer Wishlist (with size stock status & filter by isWanted)
WishlistRouter.get(
  "/",
  auth(["Buyer"]),
  WishlistController.getWishlistController
);

// 2. Add sneaker to Wishlist (with desired size & push alert options)
WishlistRouter.post(
  "/",
  auth(["Buyer"]),
  validateRequest(WishlistValidations.addToWishlistValidation),
  WishlistController.addToWishlistController
);

// 3. Remove sneaker from Wishlist
WishlistRouter.delete(
  "/:productId",
  auth(["Buyer"]),
  WishlistController.removeFromWishlistController
);

// 4. Wanted Grails (Module 11.2)
WishlistRouter.get(
  "/wanted",
  auth(["Buyer"]),
  WishlistController.getWantedGrailsController
);

WishlistRouter.post(
  "/wanted",
  auth(["Buyer"]),
  validateRequest(WishlistValidations.toggleWantedGrailValidation),
  WishlistController.toggleWantedGrailController
);

export default WishlistRouter;
