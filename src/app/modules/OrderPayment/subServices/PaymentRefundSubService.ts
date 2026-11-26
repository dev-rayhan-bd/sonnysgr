import mongoose from "mongoose";
import stripe from "../../../../config/stripe";
import OrderPaymentModel from "../OrderPayment.model";
import { OrderModel } from "../../Order/Order.model";
import { ENUM_PAYMENT_STATUS } from "../../../../utilities/enum";
import {
  CAPTURED_PAYMENT_STATUSES,
  MAX_REFUND_ATTEMPTS,
  ORDER_PAYMENT_STATUS,
  REFUND_STATUS,
  roundMoney,
  toCents,
} from "../OrderPayment.constant";
import { IPaymentRefund } from "../OrderPayment.interface";
import { StripeCheckoutSubService } from "./StripeCheckoutSubService";

interface IQueueRefundParams {
  orderId: mongoose.Types.ObjectId | string;
  /** Omit to refund everything still refundable. */
  amount?: number;
  reason: string;
  /** Deterministic per logical refund, e.g. `cancel:<orderId>` — queuing it twice is a no-op. */
  refundKey: string;
  session: mongoose.ClientSession;
}

/**
 * Sub-Service for refunds, built as a transactional outbox:
 *  1. `queueRefund` writes a PENDING refund INSIDE the business transaction (cancel, dispute…),
 *     so "order cancelled" and "refund owed" commit or roll back together.
 *  2. `processPaymentRefunds` sends it to Stripe after commit, with the refundKey as the Stripe
 *     idempotency key. The reconciliation cron retries anything still PENDING.
 */
export class PaymentRefundSubService {
  static async queueRefund(params: IQueueRefundParams) {
    const payment = await OrderPaymentModel.findOne({
      orderId: params.orderId,
      status: { $in: CAPTURED_PAYMENT_STATUSES },
    })
      .sort({ paidAt: -1 })
      .session(params.session);
    if (!payment) return null; // nothing was captured (unpaid or legacy order)

    if (payment.refunds.some((r) => r.refundKey === params.refundKey)) {
      return { paymentId: payment._id, refundKey: params.refundKey, amount: 0, duplicate: true };
    }

    // Cap by what Stripe actually captured (differs from `amount` only on an amount mismatch)
    const charged = payment.capturedAmount ?? payment.amount;
    const refundable = roundMoney(charged - payment.refundRequestedAmount);
    const amount = roundMoney(Math.min(params.amount ?? refundable, refundable));
    if (amount <= 0) return null;

    const refund: IPaymentRefund = {
      refundKey: params.refundKey,
      amount,
      reason: params.reason,
      status: REFUND_STATUS.PENDING,
      attempts: 0,
      requestedAt: new Date(),
    };

    // Guard on the amount we read: a concurrent refund makes this match nothing (no over-refund)
    const updated = await OrderPaymentModel.updateOne(
      {
        _id: payment._id,
        refundRequestedAmount: payment.refundRequestedAmount,
        "refunds.refundKey": { $ne: params.refundKey },
      },
      { $push: { refunds: refund }, $inc: { refundRequestedAmount: amount } },
      { session: params.session }
    );
    if (!updated.modifiedCount) {
      throw new Error("Refund could not be queued because the payment changed concurrently. Retry.");
    }

    return { paymentId: payment._id, refundKey: params.refundKey, amount, duplicate: false };
  }

  /** Send every PENDING refund of one payment to Stripe. Safe to call repeatedly / concurrently. */
  static async processPaymentRefunds(paymentId: mongoose.Types.ObjectId | string) {
    const payment = await OrderPaymentModel.findById(paymentId);
    if (!payment) return;

    let intentId = payment.stripePaymentIntentId;
    if (!intentId && payment.stripeSessionId) {
      const session = await StripeCheckoutSubService.retrieveSession(payment.stripeSessionId);
      intentId = StripeCheckoutSubService.paymentIntentId(session);
      if (intentId) {
        await OrderPaymentModel.updateOne({ _id: payment._id }, { $set: { stripePaymentIntentId: intentId } });
      }
    }

    for (const refund of payment.refunds.filter((r) => r.status === REFUND_STATUS.PENDING)) {
      try {
        if (!intentId) throw new Error("No Stripe PaymentIntent recorded for this payment.");
        const stripeRefund = await this.sendToStripe(intentId, refund, payment);
        await this.markSucceeded(payment._id, refund, stripeRefund.id);
      } catch (error) {
        await this.markAttemptFailed(payment._id, refund, (error as Error).message);
      }
    }

    await this.syncPaymentStatus(payment._id);
  }

  private static async sendToStripe(
    intentId: string,
    refund: IPaymentRefund,
    payment: { _id?: mongoose.Types.ObjectId; orderId: mongoose.Types.ObjectId }
  ) {
    // Stripe idempotency keys expire after 24h, so also look for a refund we already created
    const existing = await stripe.refunds.list({ payment_intent: intentId, limit: 100 });
    const found = existing.data.find((r) => r.metadata?.refundKey === refund.refundKey);
    const stripeRefund =
      found ||
      (await stripe.refunds.create(
        {
          payment_intent: intentId,
          amount: toCents(refund.amount),
          reason: "requested_by_customer",
          metadata: {
            refundKey: refund.refundKey,
            reason: refund.reason,
            paymentId: String(payment._id),
            orderId: String(payment.orderId),
          },
        },
        { idempotencyKey: `refund:${refund.refundKey}` }
      ));

    if (stripeRefund.status === "failed" || stripeRefund.status === "canceled") {
      throw new Error(`Stripe refund ${stripeRefund.id} is ${stripeRefund.status}.`);
    }
    return stripeRefund;
  }

  private static async markSucceeded(
    paymentId: mongoose.Types.ObjectId,
    refund: IPaymentRefund,
    stripeRefundId: string
  ) {
    // Matches only while still PENDING, so refundedAmount is incremented exactly once
    await OrderPaymentModel.updateOne(
      { _id: paymentId, refunds: { $elemMatch: { refundKey: refund.refundKey, status: REFUND_STATUS.PENDING } } },
      {
        $set: {
          "refunds.$.status": REFUND_STATUS.SUCCEEDED,
          "refunds.$.stripeRefundId": stripeRefundId,
          "refunds.$.processedAt": new Date(),
          "refunds.$.lastError": null,
        },
        $inc: { refundedAmount: refund.amount },
      }
    );
  }

  private static async markAttemptFailed(paymentId: mongoose.Types.ObjectId, refund: IPaymentRefund, message: string) {
    const giveUp = refund.attempts + 1 >= MAX_REFUND_ATTEMPTS;
    console.error(`[REFUND] ${refund.refundKey} attempt ${refund.attempts + 1} failed: ${message}`);
    await OrderPaymentModel.updateOne(
      { _id: paymentId, refunds: { $elemMatch: { refundKey: refund.refundKey, status: REFUND_STATUS.PENDING } } },
      {
        $set: {
          "refunds.$.lastError": message,
          ...(giveUp ? { "refunds.$.status": REFUND_STATUS.FAILED, "refunds.$.processedAt": new Date() } : {}),
        },
        // A refund we give up on no longer reserves refundable amount (admin can retry via dispute)
        $inc: { "refunds.$.attempts": 1, ...(giveUp ? { refundRequestedAmount: -refund.amount } : {}) },
      }
    );
  }

  /** Payment + order status follow the confirmed refunded amount. */
  private static async syncPaymentStatus(paymentId: mongoose.Types.ObjectId) {
    const payment = await OrderPaymentModel.findById(paymentId).select("amount capturedAmount refundedAmount status orderId").lean();
    if (!payment || payment.refundedAmount <= 0) return;

    const fullyRefunded = roundMoney(payment.refundedAmount) >= roundMoney(payment.capturedAmount ?? payment.amount);
    await OrderPaymentModel.updateOne(
      { _id: paymentId, status: { $in: CAPTURED_PAYMENT_STATUSES } },
      {
        $set: {
          status: fullyRefunded ? ORDER_PAYMENT_STATUS.REFUNDED : ORDER_PAYMENT_STATUS.PARTIALLY_REFUNDED,
        },
      }
    );
    if (fullyRefunded) {
      await OrderModel.updateOne({ _id: payment.orderId }, { $set: { paymentStatus: ENUM_PAYMENT_STATUS.REFUNDED } });
    }
  }

  /** Cron: retry every refund still PENDING. */
  static async processAllPendingRefunds(limit = 50) {
    const payments = await OrderPaymentModel.find({ "refunds.status": REFUND_STATUS.PENDING })
      .select("_id")
      .limit(limit)
      .lean();
    for (const p of payments) {
      await this.processPaymentRefunds(p._id as mongoose.Types.ObjectId).catch((err) =>
        console.error(`[REFUND] processing payment ${p._id} failed:`, err)
      );
    }
    return { processed: payments.length };
  }
}
