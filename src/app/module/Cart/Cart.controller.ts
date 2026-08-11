import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import CartServices from "./Cart.service";

const addToCartController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await CartServices.addToCartService(user, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Product added to cart successfully.",
        data: result,
    });
});

const deleteFromCartItemController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await CartServices.deleteCartItemService(user, req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Cart item removed successfully.",
        data: result,
    });
});

const increaseCartItemQuantityController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await CartServices.increaseCartItemQuantityService(user,req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Cart item quantity increased successfully.",
        data: result,
    });
});

const applyPromoCodeController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await CartServices.applypromoCodeService(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Promo code applied successfully.",
        data: result,
    });
});

const placeOrderController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await CartServices.placeOrderFromCartService(user, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Order placed successfully.",
        data: result,
    });
});

const CartController = { 
    addToCartController,
    deleteFromCartItemController,
    increaseCartItemQuantityController,
    applyPromoCodeController,
    placeOrderController
 };

export default CartController;