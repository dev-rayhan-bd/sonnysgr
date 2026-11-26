import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import idempotency from "../../middleware/idempotency";
import OrderPaymentValidations from "./OrderPayment.validation";
import OrderPaymentController from "./OrderPayment.controller";

const OrderPaymentRouter = express.Router();

// Cart / multi-item checkout -> Stripe payment link. Requires an Idempotency-Key header.
OrderPaymentRouter.post(
  "/place-order",
  auth(["Buyer"]),
  idempotency(),
  validateRequest(OrderPaymentValidations.placeOrderValidationSchema),
  OrderPaymentController.placeOrder
);

// Poll after returning from Stripe (order + payment state, resumable link while open)
OrderPaymentRouter.get(
  "/status/:orderId",
  auth(["Buyer"]),
  validateRequest(OrderPaymentValidations.paymentStatusValidationSchema),
  OrderPaymentController.getPaymentStatus
);

// Buyer billing history (orders + hold deposits, with refunds)
OrderPaymentRouter.get(
  "/my-payments",
  auth(["Buyer"]),
  validateRequest(OrderPaymentValidations.myPaymentsValidationSchema),
  OrderPaymentController.getMyPayments
);

// Dedicated router for webhook to process raw requests
const orderPaymentWebhookRouter = express.Router();

orderPaymentWebhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  OrderPaymentController.stripeWebhookHandler
);

export { orderPaymentWebhookRouter };
export default OrderPaymentRouter;
