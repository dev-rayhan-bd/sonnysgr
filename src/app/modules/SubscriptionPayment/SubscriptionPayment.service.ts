import StorePlanFacadeService from "./StorePlanFacadeService";

/**
 * Store Plan (Subscription + Boost) Services Entry Point
 * Proxies calls through StorePlanFacadeService.
 */
export const SubscriptionPaymentServices = {
  createPlan: StorePlanFacadeService.createPlan,
  updatePlan: StorePlanFacadeService.updatePlan,
  deactivatePlan: StorePlanFacadeService.deactivatePlan,
  getPlans: StorePlanFacadeService.getPlans,
  getPlanById: StorePlanFacadeService.getPlanById,
  createCheckout: StorePlanFacadeService.createCheckout,
  getMyPlanStatus: StorePlanFacadeService.getMyPlanStatus,
  getPurchaseHistory: StorePlanFacadeService.getPurchaseHistory,
};

export default SubscriptionPaymentServices;
