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

export default OrderPaymentRouter;
