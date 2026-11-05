import { IJwtPayload } from "../../../interface/jwt.interface";
import { BuyerSizeMatchDiscoverySubService } from "./subServices/BuyerSizeMatchDiscoverySubService";
import { BuyerProfileSubService } from "./subServices/BuyerProfileSubService";
import { BuyerEngagementSubService } from "./subServices/BuyerEngagementSubService";
import { IBuyerNotification } from "./Buyer.interface";

/**
 * Buyer Facade Service: High-Level Orchestrator
 * Coordinates size-match live feeds, map discovery pins, profile management, and brand interests
 */
export class BuyerFacadeService {
  // Size-Match & Map Discovery (Core USP)
  static async getLiveSizeMatchFeed(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await BuyerSizeMatchDiscoverySubService.getLiveSizeMatchFeed(userDetails, query);
  }

  static async getSizeMatchMapPins(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await BuyerSizeMatchDiscoverySubService.getSizeMatchMapPins(userDetails, query);
  }

  // Profile & Preferences
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

  static async getBuyerProfile(userDetails: IJwtPayload) {
    return await BuyerProfileSubService.getBuyerProfile(userDetails);
  }

  // Engagement & Brand Feeds
  static async getBuyersInterestsData(userDetails: IJwtPayload) {
    return await BuyerEngagementSubService.getBuyersInterestsData(userDetails);
  }

  static async getBuyerFollowedBrandsProducts(userDetails: IJwtPayload) {
    return await BuyerEngagementSubService.getBuyerFollowedBrandsProducts(userDetails);
  }
}

export default BuyerFacadeService;

