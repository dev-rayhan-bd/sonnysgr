import { IJwtPayload } from "../../../interface/jwt.interface";
import CartFacadeService from "./CartFacadeService";
import { TCartItem, TCheckoutCartPayload } from "./Cart.interface";

/**
 * Backward-compatible CartServices wrapper forwarding directly to CartFacadeService.
 * Follows Rule 3 (SRP & Facade Pattern) to eliminate giant monolithic files.
 */
export class CartServices {
  static async addToCartService(userDetails: IJwtPayload, payload: TCartItem) {
    return await CartFacadeService.addToCart(userDetails, payload);
  }

  static async getMyCartService(buyerId: string) {
    return await CartFacadeService.getMyCart(buyerId);
  }

  static async deleteCartItemService(userDetails: IJwtPayload, cartItemId: string) {
    return await CartFacadeService.removeCartItem(userDetails, cartItemId);
  }

  static async increaseCartItemQuantityService(
    userDetails: IJwtPayload,
    payload: { cartItemId: string; quantity?: number; selectedSize?: string | number }
  ) {
    return await CartFacadeService.updateCartItemQuantity(userDetails, payload);
  }

  static async applypromoCodeService(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const promoCode = String(query.promoCode || query.code || "");
    return await CartFacadeService.applyPromoCode(userDetails, promoCode);
  }

  static async placeOrderFromCartService(userDetails: IJwtPayload, payload: TCheckoutCartPayload) {
    return await CartFacadeService.checkoutCart(userDetails, payload);
  }
}

export default CartServices;
