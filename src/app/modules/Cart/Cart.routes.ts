import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import CartValidations from "./Cart.validation";
import CartController from "./Cart.controller";

const CartRouter = express.Router();

// 1. Get Cart (with live stock verification & multi-store grouping)
CartRouter.get(
  "/",
  auth(["Buyer"]),
  CartController.getMyCartController
);

CartRouter.get(
  "/my-cart",
  auth(["Buyer"]),
  CartController.getMyCartController
);

// 2. Add size variant to Cart
CartRouter.post(
  "/add",
  auth(["Buyer"]),
  validateRequest(CartValidations.addToCartValidation),
  CartController.addToCartController
);

CartRouter.post(
  "/add-to-cart",
  auth(["Buyer"]),
  CartController.addToCartController
);

// 3. Update Item Quantity / Size
CartRouter.patch(
  "/update-quantity",
  auth(["Buyer"]),
  validateRequest(CartValidations.updateCartItemQuantityValidation),
  CartController.updateCartItemQuantityController
);

CartRouter.post(
  "/increrase-cart-item-quantity/:id",
  auth(["Buyer"]),
  CartController.updateCartItemQuantityController
);

// 4. Remove Item from Cart
CartRouter.delete(
  "/remove/:id",
  auth(["Buyer"]),
  CartController.deleteFromCartItemController
);

CartRouter.delete(
  "/delete-from-cart/:id",
  auth(["Buyer"]),
  CartController.deleteFromCartItemController
);

// 5. Clear Entire Cart
CartRouter.delete(
  "/clear",
  auth(["Buyer"]),
  CartController.clearCartController
);

// 6. Apply Promo Code
CartRouter.post(
  "/apply-promo",
  auth(["Buyer"]),
  CartController.applyPromoCodeController
);

CartRouter.post(
  "/apply-promo-code",
  auth(["Buyer"]),
  CartController.applyPromoCodeController
);

// 7. Multi-store Checkout / Place Order
CartRouter.post(
  "/checkout",
  auth(["Buyer"]),
  validateRequest(CartValidations.checkoutCartValidation),
  CartController.checkoutCartController
);

CartRouter.post(
  "/place-order",
  auth(["Buyer"]),
  CartController.checkoutCartController
);

export default CartRouter;
