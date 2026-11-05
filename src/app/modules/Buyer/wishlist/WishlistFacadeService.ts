import { WishlistCommandSubService } from "./subServices/WishlistCommandSubService";
import { WishlistQuerySubService } from "./subServices/WishlistQuerySubService";
import { WishlistAlertSubService } from "./subServices/WishlistAlertSubService";

/**
 * Wishlist Facade Service: High-Level Orchestrator
 * Coordinates wishlist size-tagging, wanted grails, and automated push alerts (Module 11)
 */
export class WishlistFacadeService {
  // --- Wishlist & Wanted Grail Mutations ---
  static async addToWishlist(
    buyerId: string,
    payload: {
      productId: string;
      desiredSize?: string | number;
      notifyOnRestock?: boolean;
      notifyOnPriceDrop?: boolean;
      targetPrice?: number;
    }
  ) {
    return await WishlistCommandSubService.addToWishlist(buyerId, payload);
  }

  static async removeFromWishlist(buyerId: string, productId: string, desiredSize?: string | number) {
    return await WishlistCommandSubService.removeFromWishlist(buyerId, productId, desiredSize);
  }

  static async toggleWantedGrail(
    buyerId: string,
    payload: { productId: string; isWanted?: boolean; desiredSize?: string | number }
  ) {
    return await WishlistCommandSubService.toggleWantedGrail(buyerId, payload);
  }

  // --- Wishlist Queries (Native Aggregation, Zero .populate()) ---
  static async getWishlist(buyerId: string, query?: Record<string, unknown>) {
    return await WishlistQuerySubService.getWishlist(buyerId, query);
  }

  static async getWantedGrails(buyerId: string) {
    return await WishlistQuerySubService.getWantedGrails(buyerId);
  }

  // --- Automated Push Alerts ---
  static async triggerRestockAlerts(productId: string, size: string, storeName: string) {
    return await WishlistAlertSubService.triggerRestockAlerts(productId, size, storeName);
  }

  static async triggerPriceDropAlerts(productId: string, oldPrice: number, newPrice: number) {
    return await WishlistAlertSubService.triggerPriceDropAlerts(productId, oldPrice, newPrice);
  }
}

export default WishlistFacadeService;
