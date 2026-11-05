import { IJwtPayload } from "../../../interface/jwt.interface";
import { TCartItem, TCheckoutCartPayload } from "./Cart.interface";
import { CartItemCommandSubService } from "./subServices/CartItemCommandSubService";
import { CartQuerySubService } from "./subServices/CartQuerySubService";
import { CartCheckoutSubService } from "./subServices/CartCheckoutSubService";

/**
 * Cart Facade Service: High-Level Orchestrator
 * Coordinates cart item commands, live stock verification queries, and checkout engine
 */
export class CartFacadeService {
  // --- Cart Item Commands ---

  static async addToCart(userDetails: IJwtPayload, payload: TCartItem) {
    return await CartItemCommandSubService.addToCart(userDetails, payload);
  }

  static async updateCartItemQuantity(
    userDetails: IJwtPayload,
    payload: { cartItemId: string; quantity?: number; selectedSize?: string | number }
  ) {
    return await CartItemCommandSubService.updateCartItemQuantity(userDetails, payload);
  }

  static async removeCartItem(userDetails: IJwtPayload, cartItemId: string) {
    return await CartItemCommandSubService.removeCartItem(userDetails, cartItemId);
  }

  static async clearCart(userDetails: IJwtPayload) {
    return await CartItemCommandSubService.clearCart(userDetails);
  }

  // --- Cart Queries (Native Aggregation, Zero .populate()) ---

  static async getMyCart(buyerId: string) {
    return await CartQuerySubService.getMyCart(buyerId);
  }

  // --- Promo & Checkout Engine ---

  static async applyPromoCode(userDetails: IJwtPayload, promoCode: string, retailerId?: string) {
    return await CartCheckoutSubService.applyPromoCode(userDetails, promoCode, retailerId);
  }

  static async checkoutCart(userDetails: IJwtPayload, payload: TCheckoutCartPayload) {
    return await CartCheckoutSubService.checkoutCart(userDetails, payload);
  }
}

export default CartFacadeService;
