import WishlistFacadeService from "./WishlistFacadeService";

/**
 * Backward-compatible WishlistServices wrapper forwarding directly to WishlistFacadeService.
 * Follows Rule 3 (SRP & Facade Pattern) to eliminate giant monolithic files.
 */
export const WishlistServices = {
  addToWishlistService: WishlistFacadeService.addToWishlist,
  removeFromWishlistService: WishlistFacadeService.removeFromWishlist,
  getWishlistService: WishlistFacadeService.getWishlist,
  toggleWantedGrailService: WishlistFacadeService.toggleWantedGrail,
  getWantedGrailsService: WishlistFacadeService.getWantedGrails,
};

export default WishlistServices;
