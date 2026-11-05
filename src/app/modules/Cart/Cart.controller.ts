import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import CartFacadeService from "./CartFacadeService";
import { StatusCodes } from "http-status-codes";

const addToCartController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await CartFacadeService.addToCart(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Sneaker added to cart successfully.",
    data: result,
  });
});

const getMyCartController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await CartFacadeService.getMyCart(user.profileId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cart items retrieved with live stock status.",
    data: result,
  });
});

const updateCartItemQuantityController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const cartItemId = req.params.id || req.body.cartItemId;
  const result = await CartFacadeService.updateCartItemQuantity(user, {
    ...req.body,
    cartItemId,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cart item updated successfully.",
    data: result,
  });
});

const deleteFromCartItemController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const cartItemId = req.params.id || req.params.itemId;
  const result = await CartFacadeService.removeCartItem(user, cartItemId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cart item removed successfully.",
    data: result,
  });
});

const clearCartController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await CartFacadeService.clearCart(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cart cleared successfully.",
    data: result,
  });
});

const applyPromoCodeController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const promoCode = req.body?.promoCode || (req.query?.promoCode as string);
  const retailerId = req.body?.retailerId || (req.query?.retailerId as string);

  const result = await CartFacadeService.applyPromoCode(user, promoCode, retailerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Promo code applied successfully.",
    data: result,
  });
});

const checkoutCartController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await CartFacadeService.checkoutCart(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Order placed successfully from cart.",
    data: result,
  });
});

const CartController = {
  addToCartController,
  getMyCartController,
  updateCartItemQuantityController,
  deleteFromCartItemController,
  clearCartController,
  applyPromoCodeController,
  checkoutCartController,
  placeOrderController: checkoutCartController, // Alias for backward compatibility
};

export default CartController;
