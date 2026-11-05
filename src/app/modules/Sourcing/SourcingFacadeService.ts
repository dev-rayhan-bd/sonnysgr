import { IJwtPayload } from "../../../interface/jwt.interface";
import { SourcingRequestSubService } from "./subServices/SourcingRequestSubService";
import SourcingService from "./Sourcing.service";

export class SourcingFacadeService {
  // --- Retailer Reseller Sourcing & Trust ---
  static async toggleTrustReseller(retailerId: string, resellerId: string) {
    return SourcingService.toggleTrustReseller(retailerId, resellerId);
  }

  static async getAllActiveResellers(retailerId: string) {
    return SourcingService.getAllActiveResellers(retailerId);
  }

  static async getTrustedResellers(retailerId: string) {
    return SourcingService.getTrustedResellers(retailerId);
  }

  static async getResellerProducts(resellerId: string, query: Record<string, unknown>) {
    return SourcingService.getResellerProducts(resellerId, query);
  }

  // --- Buyer Wanted Grails & Community Sourcing Requests ---
  static async createSourcingRequest(user: IJwtPayload, payload: any) {
    return SourcingRequestSubService.createRequest(user, payload);
  }

  static async getBuyerSourcingRequests(user: IJwtPayload) {
    return SourcingRequestSubService.getBuyerRequests(user);
  }

  static async getCommunityDemandFeed(user: IJwtPayload, query: any) {
    return SourcingRequestSubService.getCommunityDemandFeed(user, query);
  }

  static async respondToSourcingRequest(
    user: IJwtPayload,
    requestId: string,
    payload: any
  ) {
    return SourcingRequestSubService.respondToRequest(user, requestId, payload);
  }
}
