import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import CartValidations from "./Cart.validation";
import CartController from "./Cart.controller";


const CartRouter = express.Router();

CartRouter.post(
    "/add-to-cart",
    authorizeUser,
    // validateRequest(CartValidations.addToCartZodSchema),
    CartController.addToCartController
);

CartRouter.get(
    "/my-cart",
    authorizeUser,
    CartController.getMyCartController
);

CartRouter.delete(
    "/delete-from-cart/:id",
    authorizeUser,
    // validateRequest(CartValidations.addToCartZodSchema),
    CartController.deleteFromCartItemController
);

CartRouter.post(
    "/increrase-cart-item-quantity/:id",
    authorizeUser,
    // validateRequest(CartValidations.addToCartZodSchema),
    CartController.increaseCartItemQuantityController
);

CartRouter.post(
    "/apply-promo-code",
    authorizeUser,
    // validateRequest(CartValidations.addToCartZodSchema),
    CartController.applyPromoCodeController
);

CartRouter.post(
    "/place-order",
    authorizeUser,
    // validateRequest(CartValidations.addToCartZodSchema),
    CartController.placeOrderController
);

export default CartRouter;