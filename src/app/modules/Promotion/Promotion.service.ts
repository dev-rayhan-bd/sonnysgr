import PromotionFacadeService from './PromotionFacadeService';

/**
 * Promotion Services Entry Point
 * Proxies calls through PromotionFacadeService for clean architectural decoupling
 */
const createNewPromotionService = PromotionFacadeService.createNewPromotion;
const editPromotionService = PromotionFacadeService.editPromotion;
const getAllRetailerPromotion = PromotionFacadeService.getAllRetailerPromotion;
const getAllBuyerPromotion = PromotionFacadeService.getAllBuyerPromotion;
const getAudiencePreview = PromotionFacadeService.getAudiencePreview;

export const handleActivePromotion = PromotionFacadeService.handleActivePromotion;
export const handleExpiredPromotion = PromotionFacadeService.handleExpiredPromotion;

const PromotionServices = {
  createNewPromotionService,
  editPromotionService,
  getAllRetailerPromotion,
  getAllBuyerPromotion,
  getAudiencePreview,
  handleActivePromotion,
  handleExpiredPromotion,
};

export default PromotionServices;
export { PromotionFacadeService };
