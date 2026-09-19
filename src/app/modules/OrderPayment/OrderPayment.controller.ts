import { Request, Response } from "express";
import Stripe from "stripe";
import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import OrderPaymentCheckoutServices from "./OrderPaymentCheckout.service";
import { completeOrderAfterPayment } from "./OrderPaymentSuccess.service";
import ApiError from "../../../error/ApiError";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-09-30.acacia" as any,
});

const placeOrder = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await OrderPaymentCheckoutServices.paymentCheckoutService({
    buyerId: user.profileId,
    ...req.body,
  });

  console.log("Order result", result);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order placed successfully.",
    data: result.data,
  });
});

const stripeWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
// console.log("sig", webhookSecret);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Must be the raw request body buffer
      sig,
      webhookSecret,
    );
  } catch (err: any) {
    // console.log(`Webhook Error: ${err.message}`);
    throw new ApiError(400, `Webhook Error: ${err.message}`);
  }

  // Handle checkout session webhook events
  if (event.type === "checkout.session.completed") {
    const sessionObj = event.data.object as Stripe.Checkout.Session;
    // console.log("checkout session", sessionObj);
    // console.log("Session ID:", sessionObj.id);
    // console.log("Payment status:", sessionObj.payment_status);
    // console.log("Customer email:", sessionObj.customer_details?.email);
    // console.log("Amount total:", sessionObj.amount_total);
    // console.log("Metadata:", sessionObj.metadata);
    const { orderId, transactionId } = sessionObj.metadata || {};

    if (orderId && transactionId) {
      await completeOrderAfterPayment({
        orderId,
        transactionId,
      });
    }
  } else if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const sessionObj = event.data.object as Stripe.Checkout.Session;
    const { orderId, transactionId } = sessionObj.metadata || {};

    if (orderId) {
      const {
        releaseOrderReservation,
      } = require("./OrderPaymentFailure.service");
      await releaseOrderReservation({
        orderId,
        transactionId,
      });
    }
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Webhook event processed successfully.",
    data: null,
  });
});

export const OrderPaymentController = {
  placeOrder,
  stripeWebhookHandler,
};

export default OrderPaymentController;
