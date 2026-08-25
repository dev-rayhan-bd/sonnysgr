import express from "express";
import { auth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import SubscriptionPaymentValidations from "./SubscriptionPayment.validation";
import SubscriptionPaymentController from "./SubscriptionPayment.controller";

const SubscriptionPaymentRouter = express.Router();

export default SubscriptionPaymentRouter;
