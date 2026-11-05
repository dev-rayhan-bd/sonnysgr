import { IJwtPayload } from "../../../interface/jwt.interface";
import { OfferCommandSubService } from "./subServices/OfferCommandSubService";
import { OfferQuerySubService } from "./subServices/OfferQuerySubService";
import { OfferNegotiationSubService } from "./subServices/OfferNegotiationSubService";
import { OfferSettlementSubService } from "./subServices/OfferSettlementSubService";

/**
 * Offer Facade Service: High-Level Orchestrator
 * Coordinates C2B buy-back offers, fee calculations, multi-round negotiations, in-store drop-off verification, and settlement
 */
export class OfferFacadeService {
  // Command Operations
  static async sendOffer(userDetails: IJwtPayload, payload: any) {
    return await OfferCommandSubService.sendOffer(userDetails, payload);
  }

  static async withdrawOffer(userDetails: IJwtPayload, offerId: string) {
    return await OfferCommandSubService.withdrawOffer(userDetails, offerId);
  }

  static async handleExpiredOffers() {
    return await OfferCommandSubService.handleExpiredOffers();
  }

  // Negotiation Operations
  static async counterOffer(userDetails: IJwtPayload, offerId: string, payload: any) {
    return await OfferNegotiationSubService.counterOffer(userDetails, offerId, payload);
  }

  static async acceptOffer(userDetails: IJwtPayload, offerId: string) {
    return await OfferNegotiationSubService.acceptOffer(userDetails, offerId);
  }

  static async declineOffer(userDetails: IJwtPayload, offerId: string, reason?: string) {
    return await OfferNegotiationSubService.declineOffer(userDetails, offerId, reason);
  }

  // In-Store Drop-off Verification & Settlement Operations
  static async verifyDropoffAndSettle(userDetails: IJwtPayload, payload: any) {
    return await OfferSettlementSubService.verifyDropoffAndSettle(userDetails, payload);
  }

  // Query Operations
  static async getMySentOffers(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await OfferQuerySubService.getMySentOffers(userDetails, query);
  }

  static async getInboundOffers(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await OfferQuerySubService.getInboundOffers(userDetails, query);
  }

  static async getOfferDetailsById(offerId: string) {
    return await OfferQuerySubService.getOfferDetailsById(offerId);
  }
}

export default OfferFacadeService;
