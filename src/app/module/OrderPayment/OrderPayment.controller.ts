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

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order placed successfully.",
    data: result.data,
  });
});

const stripeWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Must be the raw request body buffer
      sig,
      webhookSecret
    );
  } catch (err: any) {
    throw new ApiError(400, `Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { orderId, transactionId } = paymentIntent.metadata || {};

    if (orderId && transactionId) {
      await completeOrderAfterPayment({
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
