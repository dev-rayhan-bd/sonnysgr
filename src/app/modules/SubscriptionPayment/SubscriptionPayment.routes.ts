import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import SubscriptionPaymentValidations from "./SubscriptionPayment.validation";
import SubscriptionPaymentController from "./SubscriptionPayment.controller";

const SubscriptionPaymentRouter = express.Router();

// --- Plan catalog: subscription plans + boost plans (?planType=SUBSCRIPTION|BOOST) ---

SubscriptionPaymentRouter.get(
  "/plans",
  authorizeUser,
  validateRequest(SubscriptionPaymentValidations.getPlansValidationSchema),
  SubscriptionPaymentController.getPlans
);

SubscriptionPaymentRouter.get(
  "/plans/:id",
  authorizeUser,
  validateRequest(SubscriptionPaymentValidations.planIdParamValidationSchema),
  SubscriptionPaymentController.getPlanById
);

SubscriptionPaymentRouter.post(
  "/plans",
  auth(["Admin", "Super_Admin"]),
  validateRequest(SubscriptionPaymentValidations.createPlanValidationSchema),
  SubscriptionPaymentController.createPlan
);

SubscriptionPaymentRouter.patch(
  "/plans/:id",
  auth(["Admin", "Super_Admin"]),
  validateRequest(SubscriptionPaymentValidations.updatePlanValidationSchema),
  SubscriptionPaymentController.updatePlan
);

SubscriptionPaymentRouter.delete(
  "/plans/:id",
  auth(["Admin", "Super_Admin"]),
  validateRequest(SubscriptionPaymentValidations.planIdParamValidationSchema),
  SubscriptionPaymentController.deactivatePlan
);

// --- Retailer purchase flow (Stripe Checkout; activated by the order-payment webhook) ---

SubscriptionPaymentRouter.post(
  "/checkout",
  auth(["Retailer"]),
  validateRequest(SubscriptionPaymentValidations.checkoutValidationSchema),
  SubscriptionPaymentController.createCheckout
);

SubscriptionPaymentRouter.get(
  "/my-plan-status",
  auth(["Retailer"]),
  SubscriptionPaymentController.getMyPlanStatus
);

SubscriptionPaymentRouter.get(
  "/purchase-history",
  auth(["Retailer"]),
  validateRequest(SubscriptionPaymentValidations.purchaseHistoryValidationSchema),
  SubscriptionPaymentController.getPurchaseHistory
);

export default SubscriptionPaymentRouter;
