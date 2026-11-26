import Stripe from "stripe";
import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import OrderPaymentModel, { PaymentWebhookEventModel } from "../OrderPayment.model";
import StorePlanFacadeService from "../../SubscriptionPayment/StorePlanFacadeService";
import { PaymentSettlementSubService } from "./PaymentSettlementSubService";

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

/** A PROCESSING row older than this is treated as a crashed delivery and may be taken over. */
const STALE_PROCESSING_MS = 5 * 60 * 1000;

/**
 * Sub-Service handling Stripe webhook events (at-least-once delivery).
 * Layer 1: event-id dedupe (PaymentWebhookEvent). Layer 2: every handler is a compare-and-set,
 * so even a replay that slips past layer 1 changes nothing.
 */
export class PaymentWebhookSubService {
  static async handleEvent(event: Stripe.Event) {
    const claimed = await this.claimEvent(event);
    if (!claimed) return { duplicate: true };

    try {
      const result = await this.dispatch(event);
      await PaymentWebhookEventModel.updateOne({ eventId: event.id }, { $set: { status: "PROCESSED" } });
      return { duplicate: false, result };
    } catch (error) {
      // Release the claim so Stripe's retry runs the handler again
      await PaymentWebhookEventModel.deleteOne({ eventId: event.id, status: "PROCESSING" });
      throw error;
    }
  }

  private static async claimEvent(event: Stripe.Event) {
    try {
      await PaymentWebhookEventModel.create({ eventId: event.id, type: event.type, status: "PROCESSING" });
      return true;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }

    const existing = await PaymentWebhookEventModel.findOne({ eventId: event.id }).lean();
    if (!existing || existing.status === "PROCESSED") return false;

    const age = Date.now() - new Date(existing.createdAt || 0).getTime();
    if (age < STALE_PROCESSING_MS) {
      // Another delivery is processing it right now: make Stripe retry later
      throw new AppError(StatusCodes.CONFLICT, `Event ${event.id} is already being processed.`);
    }
    const takeover = await PaymentWebhookEventModel.updateOne(
      { eventId: event.id, status: "PROCESSING", createdAt: existing.createdAt },
      { $set: { createdAt: new Date() } }
    );
    return takeover.modifiedCount === 1;
  }

  private static async dispatch(event: Stripe.Event) {
    if (!event.type.startsWith("checkout.session.")) return { ignored: event.type };
    const session = event.data.object as Stripe.Checkout.Session;

    // Retailer store plans (subscription / boost) share this endpoint
    if (StorePlanFacadeService.isStorePlanSession(session)) {
      return await StorePlanFacadeService.handleCheckoutEvent(event.type, session);
    }

    const paymentId = await this.resolvePaymentId(session);
    if (!paymentId) return { ignored: "no matching payment" };

    switch (event.type) {
      case "checkout.session.completed":
        // Async methods (bank debits) complete unpaid and settle later via async_payment_succeeded
        if (session.payment_status !== "paid") return { pending: true };
        return await PaymentSettlementSubService.confirmPayment(paymentId, session);
      case "checkout.session.async_payment_succeeded":
        return await PaymentSettlementSubService.confirmPayment(paymentId, session);
      case "checkout.session.expired":
        return await PaymentSettlementSubService.failPayment(paymentId, "CHECKOUT_EXPIRED", true);
      case "checkout.session.async_payment_failed":
        return await PaymentSettlementSubService.failPayment(paymentId, "ASYNC_PAYMENT_FAILED");
      default:
        return { ignored: event.type };
    }
  }

  /** New sessions carry metadata.paymentId; older ones only transactionId. */
  private static async resolvePaymentId(session: Stripe.Checkout.Session) {
    const metadata = session.metadata || {};
    if (metadata.paymentId) return metadata.paymentId;

    const payment = await OrderPaymentModel.findOne(
      metadata.transactionId ? { transactionId: metadata.transactionId } : { stripeSessionId: session.id }
    )
      .select("_id")
      .lean();
    return payment ? String(payment._id) : null;
  }
}
