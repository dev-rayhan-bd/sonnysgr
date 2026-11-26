import { model, Schema, models, Model } from "mongoose";
import { IOrderPayment, IPaymentRefund } from "./OrderPayment.interface";
import {
  IDEMPOTENCY_TTL_SECONDS,
  ORDER_PAYMENT_STATUS,
  ORDER_PAYMENT_TYPE,
  REFUND_STATUS,
} from "./OrderPayment.constant";

const PaymentRefundSchema = new Schema<IPaymentRefund>(
  {
    refundKey: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
    },
    stripeRefundId: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { _id: true }
);

const OrderPaymentSchema = new Schema<IOrderPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true, index: true },
    paymentType: {
      type: String,
      enum: Object.values(ORDER_PAYMENT_TYPE),
      default: ORDER_PAYMENT_TYPE.ORDER,
    },
    amount: { type: Number, required: true },
    capturedAmount: { type: Number, default: null },
    currency: { type: String, default: "usd" },
    gateway: { type: String, enum: ["STRIPE"], required: true },
    transactionId: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: Object.values(ORDER_PAYMENT_STATUS),
      default: ORDER_PAYMENT_STATUS.PENDING,
      index: true,
    },
    stripeSessionId: { type: String, default: null, index: true },
    stripePaymentIntentId: { type: String, default: null },
    checkoutUrl: { type: String, default: null },
    checkoutExpiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    refundRequestedAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    refunds: { type: [PaymentRefundSchema], default: [] },
    depositForfeitedAt: { type: Date, default: null },
    gatewayResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Reconciliation job: stale pending checkouts and queued refunds
OrderPaymentSchema.index({ status: 1, checkoutExpiresAt: 1 });
OrderPaymentSchema.index({ "refunds.status": 1 });

export const OrderPaymentModel: Model<IOrderPayment> =
  (models.OrderPayment as Model<IOrderPayment>) ||
  model<IOrderPayment>("OrderPayment", OrderPaymentSchema);

/**
 * One row per Stripe event id. Stripe delivers events at least once, so a duplicate delivery
 * finds the row and is acknowledged without running the handler again.
 */
interface IPaymentWebhookEvent {
  eventId: string;
  type: string;
  status: "PROCESSING" | "PROCESSED";
  createdAt?: Date;
}

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    status: { type: String, enum: ["PROCESSING", "PROCESSED"], default: "PROCESSING" },
  },
  { timestamps: true }
);
// Stripe stops retrying after 3 days; keep a month for audit
PaymentWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const PaymentWebhookEventModel: Model<IPaymentWebhookEvent> =
  (models.PaymentWebhookEvent as Model<IPaymentWebhookEvent>) ||
  model<IPaymentWebhookEvent>("PaymentWebhookEvent", PaymentWebhookEventSchema);

/** Client `Idempotency-Key` header records (see middleware/idempotency.ts). */
export interface IIdempotencyRecord {
  scope: string;
  requestHash: string;
  status: "PROCESSING" | "COMPLETED";
  responseStatus?: number;
  responseBody?: unknown;
  createdAt?: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    scope: { type: String, required: true, unique: true },
    requestHash: { type: String, required: true },
    status: { type: String, enum: ["PROCESSING", "COMPLETED"], default: "PROCESSING" },
    responseStatus: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);
IdempotencyRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: IDEMPOTENCY_TTL_SECONDS });

export const IdempotencyRecordModel: Model<IIdempotencyRecord> =
  (models.IdempotencyRecord as Model<IIdempotencyRecord>) ||
  model<IIdempotencyRecord>("IdempotencyRecord", IdempotencyRecordSchema);

export default OrderPaymentModel;
