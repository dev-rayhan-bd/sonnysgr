import { IJwtPayload } from "../../../interface/jwt.interface";
import { BuyerSizeMatchDiscoverySubService } from "./subServices/BuyerSizeMatchDiscoverySubService";
import { BuyerProfileSubService } from "./subServices/BuyerProfileSubService";
import { BuyerEngagementSubService } from "./subServices/BuyerEngagementSubService";
import { BuyerHistorySubService } from "./subServices/BuyerHistorySubService";
import { BuyerLoyaltySubService } from "./subServices/BuyerLoyaltySubService";
import { BuyerReferralSubService } from "./subServices/BuyerReferralSubService";
import { IBuyerNotification } from "./Buyer.interface";

/**
 * Buyer Facade Service: High-Level Orchestrator
 * Coordinates size-match live feeds, map discovery pins, profile management,
 * purchase history, and physical store visit footprints (Modules 1, 2, 3, 4, 5)
 */
export class BuyerFacadeService {
  // 1. Size-Match & Map Discovery (Core USP - Modules 2, 3, 4, 5)
  static async getLiveSizeMatchFeed(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await BuyerSizeMatchDiscoverySubService.getLiveSizeMatchFeed(userDetails, query);
  }

  static async getSizeMatchMapPins(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await BuyerSizeMatchDiscoverySubService.getSizeMatchMapPins(userDetails, query);
  }

  // 2. Profile, Preferences & Onboarding
  static async setBuyerNotificationAlerts(userDetails: IJwtPayload, payload: IBuyerNotification) {
    return await BuyerProfileSubService.setBuyerNotificationAlerts(userDetails, payload);
  }

  static async addSelectedShoeSize(
    userDetails: IJwtPayload,
    payload: { label: string; size: number }[]
  ) {
    return await BuyerProfileSubService.addSelectedShoeSize(userDetails, payload);
  }

  static async addBrandsOfInterest(userDetails: IJwtPayload, payload: string[]) {
    return await BuyerProfileSubService.addBrandsOfInterest(userDetails, payload);
  }

  static async updateBuyerProfile(
    userDetails: IJwtPayload,
    file: Express.Multer.File | undefined,
    payload: any
  ) {
    return await BuyerProfileSubService.updateBuyerProfile(userDetails, file, payload);
  }

  static async updateBuyerProfileService(
    userDetails: IJwtPayload,
    file: Express.Multer.File | undefined,
    payload: any
  ) {
    return await BuyerProfileSubService.updateBuyerProfile(userDetails, file, payload);
  }

  static async completeBuyerProfile(
    userDetails?: IJwtPayload,
    email?: string,
    payload?: any
  ) {
    return await BuyerProfileSubService.completeBuyerProfile(userDetails, email, payload);
  }

  static async completeBuyerProfileService(
    userDetails?: IJwtPayload,
    email?: string,
    payload?: any
  ) {
    return await BuyerProfileSubService.completeBuyerProfile(userDetails, email, payload);
  }

  static async getBuyerProfile(userDetails: IJwtPayload) {
    return await BuyerProfileSubService.getBuyerProfile(userDetails);
  }

  // 3. Engagement, Wishlist & Feeds (Native Aggregation, Zero .populate())
  static async getBuyersInterestsData(userDetails: IJwtPayload) {
    return await BuyerEngagementSubService.getBuyersInterestsData(userDetails);
  }

  static async getBuyersStoreBrandWishlistdataService(userDetails: IJwtPayload) {
    return await BuyerEngagementSubService.getBuyersStoreBrandWishlistdataService(userDetails);
  }

  static async getBuyerFollowedBrandsProducts(userDetails: IJwtPayload) {
    return await BuyerEngagementSubService.getBuyerFollowedBrandsProducts(userDetails);
  }

  static async getBuyerFollowedRetailersProducts(userDetails: IJwtPayload) {
    return await BuyerEngagementSubService.getBuyerFollowedRetailersProducts(userDetails);
  }

  static async getAllRetailersByBuyer(userDetails: IJwtPayload, query: Record<string, any>) {
    return await BuyerEngagementSubService.getAllRetailersByBuyer(userDetails, query);
  }

  static async getSingleRetailerByBuyer(userDetails: IJwtPayload, retailerId: string) {
    return await BuyerEngagementSubService.getSingleRetailerByBuyer(userDetails, retailerId);
  }

  static async getNearbyProductsForBuyer(userDetails: IJwtPayload, query: Record<string, any>) {
    return await BuyerEngagementSubService.getNearbyProductsForBuyer(userDetails, query);
  }

  // 4. Purchase History & Physical Store Footprint (Module 1.8 & 1.9)
  static async getPurchaseHistory(buyerId: string, query: Record<string, unknown> = {}) {
    return await BuyerHistorySubService.getPurchaseHistory(buyerId, query);
  }

  static async recordQrCheckin(buyerId: string, payload: any) {
    return await BuyerHistorySubService.recordQrCheckin(buyerId, payload);
  }

  static async getStoreVisitHistory(buyerId: string) {
    return await BuyerHistorySubService.getStoreVisitHistory(buyerId);
  }

  // 5. VIP Loyalty & Daily Check-in Rewards (Module 1.11 & 13)
  static async getVipStatus(user: IJwtPayload) {
    return await BuyerLoyaltySubService.getVipStatus(user);
  }

  static async claimDailyLogin(user: IJwtPayload) {
    return await BuyerLoyaltySubService.claimDailyLogin(user);
  }

  // 6. Viral Referral Credit Engine (Module 13.4)
  static async getMyReferralCode(user: IJwtPayload) {
    return await BuyerReferralSubService.getMyReferralCode(user);
  }

  static async applyReferralCode(user: IJwtPayload, code: string) {
    return await BuyerReferralSubService.applyReferralCode(user, code);
  }

  static async getReferralEarnings(user: IJwtPayload) {
    return await BuyerReferralSubService.getReferralEarnings(user);
  }
}

export default BuyerFacadeService;
