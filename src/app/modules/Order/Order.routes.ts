import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import OrderController from "./Order.controller";
import validateRequest from "../../middleware/validateRequest";
import OrderValidations from "./Order.validation";
import idempotency from "../../middleware/idempotency";
import OrderPaymentValidations from "../OrderPayment/OrderPayment.validation";

const OrderRouter = express.Router();

// --- 1. Retailer 4-Stage Order Management Feed & Fulfillment ---
OrderRouter.get(
  "/retailer-orders",
  auth(["Retailer"]),
  OrderController.getRetailerOrdersByStageController
);

OrderRouter.get(
  "/retailer-order-stat",
  auth(["Retailer"]),
  OrderController.getRetailerHomePageOrderStatDataController
);

OrderRouter.get(
  "/get-order-detail/:id",
  authorizeUser,
  OrderController.getOrderDetailController
);

OrderRouter.post(
  "/retailer-accept-order/:id",
  auth(["Retailer"]),
  OrderController.retailerAcceptOrder
);

OrderRouter.patch(
  "/retailer-mark-ready/:id",
  auth(["Retailer"]),
  OrderController.retailerMarkReadyController
);

OrderRouter.patch(
  "/retailer-complete-order/:id",
  auth(["Retailer"]),
  OrderController.retailerCompleteOrderController
);

OrderRouter.patch(
  "/retailer-cancel-order/:id",
  auth(["Retailer"]),
  idempotency({ required: false }),
  validateRequest(OrderValidations.retailerCancelValidation),
  OrderController.retailerCancelOrderController
);

// Retailer "Verify Pickup" tool: scan the buyer's QR / enter the 6-digit code to release a Buy Now order
OrderRouter.post(
  "/verify-pickup",
  auth(["Retailer"]),
  validateRequest(OrderValidations.verifyPickupValidation),
  OrderController.verifyPickupController
);

// Retailer In-Store Verification & Settlement of Hold Reservations
OrderRouter.post(
  "/settle-hold",
  auth(["Retailer"]),
  validateRequest(OrderValidations.settleHoldValidation),
  OrderController.settleInStoreHoldOrderController
);

// --- 2. Buyer Order, Holds & Checkout Lifecycle Endpoints ---
// Returns a Stripe paymentLink; the order is "Pending Payment" until the webhook confirms it
OrderRouter.post(
  "/create-buy-now",
  auth(["Buyer"]),
  idempotency(),
  validateRequest(OrderPaymentValidations.buyNowValidationSchema),
  OrderController.createBuyNowOrderController
);

// Returns a Stripe paymentLink for the deposit; the hold timer starts once it is paid
OrderRouter.post(
  "/create-hold-deposit",
  auth(["Buyer"]),
  idempotency(),
  validateRequest(OrderPaymentValidations.holdDepositValidationSchema),
  OrderController.createHoldDepositOrderController
);

OrderRouter.get(
  "/my-holds",
  auth(["Buyer"]),
  OrderController.getMyActiveHoldsController
);

OrderRouter.get(
  "/my-orders",
  auth(["Buyer"]),
  OrderController.getMyOrders
);

OrderRouter.get(
  "/details/:orderId",
  auth(["Buyer", "Retailer"]),
  OrderController.getBuyerOrderDetailsController
);

OrderRouter.post(
  "/cancel/:orderId",
  auth(["Buyer"]),
  idempotency({ required: false }),
  validateRequest(OrderValidations.cancelOrderValidation),
  OrderController.cancelBuyerOrderController
);

export default OrderRouter;
