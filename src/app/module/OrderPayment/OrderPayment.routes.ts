import express from "express";
import { auth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import OrderPaymentValidations from "./OrderPayment.validation";
import OrderPaymentController from "./OrderPayment.controller";

const OrderPaymentRouter = express.Router();

OrderPaymentRouter.post(
  "/place-order",
  auth(["Buyer"]),
  validateRequest(OrderPaymentValidations.placeOrderValidationSchema),
  OrderPaymentController.placeOrder
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
