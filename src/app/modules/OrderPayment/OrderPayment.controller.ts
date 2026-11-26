import { Request, Response } from "express";
import Stripe from "stripe";
import { StatusCodes } from "http-status-codes";
import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import ApiError from "../../../error/ApiError";
import config from "../../config";
import stripe from "../../../config/stripe";
import OrderPaymentFacadeService from "./OrderPaymentFacadeService";

const placeOrder = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await OrderPaymentFacadeService.placeOrder(user.profileId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Order created. Complete payment via the payment link.",
    data: result,
  });
});

const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await OrderPaymentFacadeService.getPaymentStatus(user.profileId, String(req.params.orderId));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payment status retrieved successfully.",
    data: result,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await OrderPaymentFacadeService.getMyPayments(user.profileId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payments retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const stripeWebhookHandler = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = config.stripe.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || "";

  let event: Stripe.Event;
  try {
    // Must be the raw request body buffer (router is mounted before express.json)
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    throw new ApiError(400, `Webhook Error: ${(err as Error).message}`);
  }

  // Throws on failure -> non-2xx -> Stripe retries the event
  const result = await OrderPaymentFacadeService.handleWebhookEvent(event);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.duplicate ? "Duplicate webhook event ignored." : "Webhook event processed successfully.",
    data: null,
  });
});

export const OrderPaymentController = {
  placeOrder,
  getPaymentStatus,
  getMyPayments,
  stripeWebhookHandler,
};

export default OrderPaymentController;
