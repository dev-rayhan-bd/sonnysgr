import { IJwtPayload } from '../../../interface/jwt.interface';
import { IPromotion } from './Promotion.interface';
import { PromotionCommandSubService } from './subServices/PromotionCommandSubService';
import { PromotionAudienceSubService } from './subServices/PromotionAudienceSubService';
import { PromotionFeedSubService } from './subServices/PromotionFeedSubService';

/**
 * Promotion Facade Service: High-Level Orchestrator
 * Coordinates flash sales, multi-cloud media uploads, audience preview, and feeds
 */
export class PromotionFacadeService {
  // Command & Storage Actions
  static async createNewPromotion(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    payload: Partial<IPromotion>
  ) {
    return await PromotionCommandSubService.createNewPromotion(userDetails, files, payload);
  }

  static async editPromotion(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    promotionId: string,
    payload: Partial<IPromotion>
  ) {
    return await PromotionCommandSubService.editPromotion(userDetails, files, promotionId, payload);
  }

  static async handleActivePromotion() {
    return await PromotionCommandSubService.handleActivePromotion();
  }

  static async handleExpiredPromotion() {
    return await PromotionCommandSubService.handleExpiredPromotion();
  }

  // Audience & Reach Estimation
  static async getAudiencePreview(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await PromotionAudienceSubService.getAudiencePreview(userDetails, query);
  }

  // Feeds & Listings
  static async getAllRetailerPromotion(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await PromotionFeedSubService.getAllRetailerPromotion(userDetails, query);
  }

  static async getAllBuyerPromotion(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await PromotionFeedSubService.getAllBuyerPromotion(userDetails, query);
  }
}

export default PromotionFacadeService;

