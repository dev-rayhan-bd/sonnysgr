import Stripe from "stripe";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { IStorePlan, IStorePlanCheckoutPayload } from "./SubscriptionPayment.interface";
import { STORE_PLAN_PAYMENT_TYPE } from "./SubscriptionPayment.constant";
import { StorePlanCatalogSubService } from "./subServices/StorePlanCatalogSubService";
import { StorePlanCheckoutSubService } from "./subServices/StorePlanCheckoutSubService";
import { StorePlanActivationSubService } from "./subServices/StorePlanActivationSubService";
import { StorePlanQuerySubService } from "./subServices/StorePlanQuerySubService";

/**
 * Store Plan Facade: subscription plans + boost plans for retailers.
 * Controllers and the Stripe webhook talk only to this facade.
 */
export class StorePlanFacadeService {
  // --- Catalog (admin managed) ---
  static async createPlan(payload: Partial<IStorePlan>) {
    return await StorePlanCatalogSubService.createPlan(payload);
  }

  static async updatePlan(planId: string, payload: Partial<IStorePlan>) {
    return await StorePlanCatalogSubService.updatePlan(planId, payload);
  }

  static async deactivatePlan(planId: string) {
    return await StorePlanCatalogSubService.deactivatePlan(planId);
  }

  static async getPlans(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await StorePlanCatalogSubService.getPlans(userDetails, query);
  }

  static async getPlanById(userDetails: IJwtPayload, planId: string) {
    return await StorePlanCatalogSubService.getPlanById(userDetails, planId);
  }

  // --- Retailer purchase flow ---
  static async createCheckout(userDetails: IJwtPayload, payload: IStorePlanCheckoutPayload) {
    return await StorePlanCheckoutSubService.createCheckout(userDetails, payload);
  }

  static async getMyPlanStatus(userDetails: IJwtPayload) {
    return await StorePlanQuerySubService.getMyPlanStatus(userDetails);
  }

  static async getPurchaseHistory(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await StorePlanQuerySubService.getPurchaseHistory(userDetails, query);
  }

  // --- Stripe webhook ---
  static isStorePlanSession(sessionObj: Stripe.Checkout.Session) {
    return sessionObj.metadata?.paymentType === STORE_PLAN_PAYMENT_TYPE;
  }

  /**
   * Handles checkout.session.* events whose metadata.paymentType is STORE_PLAN.
   */
  static async handleCheckoutEvent(eventType: string, sessionObj: Stripe.Checkout.Session) {
    const purchaseId = sessionObj.metadata?.purchaseId;
    if (!purchaseId) return null;

    if (eventType === "checkout.session.completed") {
      if (sessionObj.payment_status !== "paid") return null; // async methods settle later
      return await StorePlanActivationSubService.activatePurchase({
        purchaseId,
        stripePaymentIntentId:
          typeof sessionObj.payment_intent === "string" ? sessionObj.payment_intent : null,
      });
    }

    if (eventType === "checkout.session.async_payment_succeeded") {
      return await StorePlanActivationSubService.activatePurchase({ purchaseId });
    }

    if (
      eventType === "checkout.session.expired" ||
      eventType === "checkout.session.async_payment_failed"
    ) {
      return await StorePlanActivationSubService.failPurchase({
        purchaseId,
        expired: eventType === "checkout.session.expired",
      });
    }

    return null;
  }
}

export default StorePlanFacadeService;
