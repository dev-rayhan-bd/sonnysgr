import Stripe from "stripe";
import OrderPaymentModel from "../OrderPayment.model";
import { ORDER_PAYMENT_STATUS, RECONCILE_GRACE_MINUTES } from "../OrderPayment.constant";
import { PaymentSettlementSubService } from "./PaymentSettlementSubService";
import { PaymentRefundSubService } from "./PaymentRefundSubService";
import { StripeCheckoutSubService } from "./StripeCheckoutSubService";

/** A checkout that never got a Stripe session (crash between commit and Stripe call). */
const ORPHAN_CHECKOUT_MINUTES = 15;
/** Payments created before checkoutExpiresAt existed default to Stripe's 24h session lifetime. */
const LEGACY_SESSION_HOURS = 25;

/**
 * Sub-Service run by cron. Webhooks can be lost or delayed, so this job asks Stripe directly
 * about every pending checkout past its expiry and settles it the same way the webhook would.
 */
export class PaymentReconciliationSubService {
  static async reconcileStaleCheckouts(limit = 100) {
    const now = Date.now();
    const stale = await OrderPaymentModel.find({
      status: ORDER_PAYMENT_STATUS.PENDING,
      $or: [
        { checkoutExpiresAt: { $lt: new Date(now - RECONCILE_GRACE_MINUTES * 60 * 1000) } },
        { stripeSessionId: null, createdAt: { $lt: new Date(now - ORPHAN_CHECKOUT_MINUTES * 60 * 1000) } },
        { checkoutExpiresAt: null, createdAt: { $lt: new Date(now - LEGACY_SESSION_HOURS * 60 * 60 * 1000) } },
      ],
    })
      .select("_id stripeSessionId")
      .limit(limit)
      .lean();

    let confirmed = 0;
    let cancelled = 0;
    for (const payment of stale) {
      const paymentId = String(payment._id);
      try {
        if (!payment.stripeSessionId) {
          await PaymentSettlementSubService.failPayment(paymentId, "CHECKOUT_NOT_CREATED", true);
          cancelled++;
          continue;
        }

        let session: Stripe.Checkout.Session = await StripeCheckoutSubService.retrieveSession(payment.stripeSessionId);
        if (session.status === "open") {
          session = (await StripeCheckoutSubService.expireSession(session.id)) || session;
        }

        if (session.payment_status === "paid") {
          await PaymentSettlementSubService.confirmPayment(paymentId, session);
          confirmed++;
        } else if (session.status !== "complete") {
          await PaymentSettlementSubService.failPayment(paymentId, "CHECKOUT_EXPIRED", true);
          cancelled++;
        }
        // status "complete" but unpaid = async payment in flight: wait for its webhook
      } catch (error) {
        console.error(`[RECONCILE] payment ${paymentId} failed:`, (error as Error).message);
      }
    }

    return { checked: stale.length, confirmed, cancelled };
  }

  static async retryPendingRefunds() {
    return await PaymentRefundSubService.processAllPendingRefunds();
  }
}
