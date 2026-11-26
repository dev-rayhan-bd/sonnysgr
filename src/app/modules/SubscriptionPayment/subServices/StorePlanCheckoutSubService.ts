import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import config from "../../../config";
import stripe from "../../../../config/stripe";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import RetailerModel from "../../Retailer/Retailer.model";
import { StorePlanModel, StorePlanPurchaseModel } from "../SubscriptionPayment.model";
import { IStorePlan, IStorePlanCheckoutPayload } from "../SubscriptionPayment.interface";
import {
  STORE_PLAN_PAYMENT_TYPE,
  STORE_PLAN_PURCHASE_STATUS,
} from "../SubscriptionPayment.constant";

/**
 * Sub-Service dedicated to starting a plan purchase via Stripe Checkout.
 * Activation happens later in StorePlanActivationSubService (webhook).
 */
export class StorePlanCheckoutSubService {
  static async createCheckout(userDetails: IJwtPayload, payload: IStorePlanCheckoutPayload) {
    const { profileId } = userDetails;

    if (!mongoose.Types.ObjectId.isValid(payload.planId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid plan id.");
    }

    const [retailer, plan] = await Promise.all([
      RetailerModel.findById(profileId).select("name email").lean() as Promise<{
        name: string;
        email: string;
      } | null>,
      StorePlanModel.findOne({ _id: payload.planId, isActive: true }).lean() as Promise<IStorePlan | null>,
    ]);

    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer profile not found.");
    }
    if (!plan) {
      throw new AppError(StatusCodes.NOT_FOUND, "Plan not found or no longer available.");
    }

    const transactionId = `SP-${randomUUID()}`;

    const purchase = await StorePlanPurchaseModel.create({
      retailerId: new mongoose.Types.ObjectId(profileId),
      planId: plan._id,
      planType: plan.planType,
      planSnapshot: {
        title: plan.title,
        price: plan.price,
        durationDays: plan.durationDays,
      },
      amount: plan.price,
      currency: "usd",
      transactionId,
      status: STORE_PLAN_PURCHASE_STATUS.PENDING,
    });

    const baseUrl = config.frontend_url || config.server_url;

    try {
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: retailer.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.title} (${plan.durationDays} days)`,
                description: plan.description || undefined,
              },
              unit_amount: Math.round(plan.price * 100),
            },
            quantity: 1,
          },
        ],
        success_url:
          payload.successUrl ||
          `${baseUrl}/store-plan/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: payload.cancelUrl || `${baseUrl}/store-plan/payment-cancel`,
        metadata: {
          paymentType: STORE_PLAN_PAYMENT_TYPE,
          purchaseId: purchase._id.toString(),
          transactionId,
        },
      },
      { idempotencyKey: `store-plan-checkout:${purchase._id}` });

      await StorePlanPurchaseModel.updateOne(
        { _id: purchase._id },
        { $set: { stripeSessionId: stripeSession.id } }
      );

      return {
        paymentLink: stripeSession.url || "",
        purchaseId: purchase._id,
        transactionId,
        plan: {
          _id: plan._id,
          planType: plan.planType,
          title: plan.title,
          price: plan.price,
          durationDays: plan.durationDays,
        },
      };
    } catch (error) {
      // Do not leave an orphan PENDING purchase when Stripe rejects the session
      await StorePlanPurchaseModel.updateOne(
        { _id: purchase._id },
        { $set: { status: STORE_PLAN_PURCHASE_STATUS.FAILED } }
      );
      const message = error instanceof Error ? error.message : "Stripe checkout failed.";
      throw new AppError(StatusCodes.BAD_GATEWAY, `Unable to start checkout: ${message}`);
    }
  }
}
