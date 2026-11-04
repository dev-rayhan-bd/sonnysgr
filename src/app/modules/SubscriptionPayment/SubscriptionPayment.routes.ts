import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import SubscriptionPaymentValidations from "./SubscriptionPayment.validation";
import SubscriptionPaymentController from "./SubscriptionPayment.controller";

const SubscriptionPaymentRouter = express.Router();

export default SubscriptionPaymentRouter;
