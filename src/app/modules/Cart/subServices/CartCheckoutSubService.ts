import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import { ENUM_CART_STATUS } from "../../../../utilities/enum";
import CartModel from "../Cart.model";
import { TCheckoutCartPayload } from "../Cart.interface";
import OrderPaymentFacadeService from "../../OrderPayment/OrderPaymentFacadeService";
import { IPlaceOrderPayload } from "../../OrderPayment/OrderPayment.interface";

/**
 * Sub-Service dedicated to Promo Application & Multi-Vendor Cart Checkout
 * Orchestrates atomic transactions, inventory deduction, and pickup verification codes
 */
export class CartCheckoutSubService {
  /**
   * Apply promotional voucher / discount code
   */
  static async applyPromoCode(
    userDetails: IJwtPayload,
    promoCode: string,
    retailerId?: string
  ) {
    const { profileId } = userDetails;

    if (!promoCode || !promoCode.trim()) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Promo code is required.");
    }

    const code = promoCode.trim().toUpperCase();

    // Fetch active cart items
    const cartItems = await CartModel.find({
      buyerId: profileId,
      status: ENUM_CART_STATUS.ACTIVE,
    }).lean();

    if (!cartItems.length) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Your cart is empty.");
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate discount based on recognized campaign promo codes
    let discountPercent = 0;
    let fixedDiscount = 0;

    if (code === "WELCOME10") {
      discountPercent = 10;
    } else if (code === "GOSNKR20") {
      discountPercent = 20;
    } else if (code === "FREEDROP") {
      fixedDiscount = 15;
    } else {
      throw new AppError(StatusCodes.BAD_REQUEST, `Invalid or expired promo code: ${code}`);
    }

    const discountAmount = discountPercent > 0
      ? Math.round((subtotal * discountPercent) / 100 * 100) / 100
      : Math.min(fixedDiscount, subtotal);

    const discountedTotal = Math.max(0, subtotal - discountAmount);

    return {
      promoCode: code,
      discountPercent,
      discountAmount,
      originalSubtotal: subtotal,
      discountedTotal,
    };
  }

  /**
   * Cart checkout = Stripe checkout of the buyer's active cart lines.
   * This used to create an order marked PAID without taking any payment; it now goes through
   * the same flow as POST /order-payment/place-order (Pending Payment until Stripe confirms,
   * database prices, stock reserved, cart lines marked ordered only after payment).
   */
  static async checkoutCart(userDetails: IJwtPayload, payload: TCheckoutCartPayload) {
    const { profileId } = userDetails;

    if (payload.promoCode && payload.promoCode.trim()) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Promo codes can't be applied at checkout yet. Remove the code to continue."
      );
    }

    const cartItems = await CartModel.find({ buyerId: profileId, status: ENUM_CART_STATUS.ACTIVE })
      .select("productId selectedSize quantity")
      .lean<{ productId: mongoose.Types.ObjectId; selectedSize: string | number; quantity: number }[]>();
    if (!cartItems.length) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Cart is empty. Cannot proceed to checkout.");
    }

    const address = payload.shippingAddress;
    const hasAddress =
      payload.fulfillmentType !== "STORE_PICKUP" && !!address?.name && !!address?.phone && !!address?.address;

    return await OrderPaymentFacadeService.placeOrder(profileId, {
      // No complete address (or store pickup) -> in-store pickup order
      shippingAddress: (hasAddress
        ? { name: address!.name!, phone: address!.phone!, address: address!.address! }
        : undefined) as IPlaceOrderPayload["shippingAddress"],
      orderItems: cartItems.map((c) => ({
        productId: String(c.productId),
        selectedSize: c.selectedSize,
        quantity: c.quantity,
      })),
      successUrl: payload.successUrl,
      cancelUrl: payload.cancelUrl,
    });
  }
}
