import Stripe from "stripe";
import config from "../../../config";
import stripe from "../../../../config/stripe";
import OrderPaymentModel from "../OrderPayment.model";
import { CHECKOUT_SESSION_TTL_MINUTES, TOrderPaymentType } from "../OrderPayment.constant";
import { ICheckoutRedirects } from "../OrderPayment.interface";

export interface ICheckoutLine {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity: number;
}

interface ICreateSessionParams {
  paymentId: string;
  orderId: string;
  transactionId: string;
  paymentType: TOrderPaymentType;
  lines: ICheckoutLine[];
  customerEmail?: string | null;
  redirects: ICheckoutRedirects;
}

/**
 * Sub-Service wrapping Stripe Checkout for buyer payments (orders + hold deposits).
 * Called OUTSIDE any DB transaction: a network call must never hold a transaction open.
 */
export class StripeCheckoutSubService {
  static async createSession(params: ICreateSessionParams) {
    const baseUrl = config.frontend_url || config.server_url;
    const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MINUTES * 60 * 1000);
    const metadata = {
      paymentType: params.paymentType,
      paymentId: params.paymentId,
      orderId: params.orderId,
      transactionId: params.transactionId,
    };

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: params.customerEmail || undefined,
        client_reference_id: params.paymentId,
        line_items: params.lines.map((line) => ({
          price_data: {
            currency: "usd",
            product_data: { name: line.name, description: line.description || undefined },
            unit_amount: line.unitAmountCents,
          },
          quantity: line.quantity,
        })),
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        success_url:
          params.redirects.successUrl ||
          `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&orderId=${params.orderId}`,
        cancel_url: params.redirects.cancelUrl || `${baseUrl}/payment-cancel?orderId=${params.orderId}`,
        metadata,
        // Same metadata on the PaymentIntent so refunds/disputes in the Stripe dashboard trace back
        payment_intent_data: { metadata },
      },
      // Retrying the same payment never creates a second Stripe session
      { idempotencyKey: `checkout-session:${params.paymentId}` }
    );

    await OrderPaymentModel.updateOne(
      { _id: params.paymentId },
      {
        $set: {
          stripeSessionId: session.id,
          checkoutUrl: session.url,
          checkoutExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : expiresAt,
        },
      }
    );

    return { url: session.url || "", expiresAt, sessionId: session.id };
  }

  static async retrieveSession(sessionId: string) {
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Close an open session so it can no longer be paid. Returns the latest session, or null if
   * Stripe refused (e.g. it was already completed — the webhook then refunds the late payment).
   */
  static async expireSession(sessionId?: string | null): Promise<Stripe.Checkout.Session | null> {
    if (!sessionId) return null;
    try {
      return await stripe.checkout.sessions.expire(sessionId);
    } catch (error) {
      console.warn(`[PAYMENT] could not expire checkout session ${sessionId}:`, (error as Error).message);
      return null;
    }
  }

  static paymentIntentId(session: Stripe.Checkout.Session) {
    const intent = session.payment_intent;
    if (!intent) return null;
    return typeof intent === "string" ? intent : intent.id;
  }
}
