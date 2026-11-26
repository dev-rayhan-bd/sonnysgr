import { Types } from "mongoose";
import { TOrderPaymentStatus, TOrderPaymentType, TRefundStatus } from "./OrderPayment.constant";

export interface IPaymentRefund {
  _id?: Types.ObjectId;
  /** Deterministic key; also the Stripe idempotency key, so one logical refund is sent once. */
  refundKey: string;
  amount: number;
  reason: string;
  status: TRefundStatus;
  stripeRefundId?: string | null;
  attempts: number;
  lastError?: string | null;
  requestedAt: Date;
  processedAt?: Date | null;
}

export interface IOrderPayment {
  _id?: Types.ObjectId;
  orderId: Types.ObjectId;
  buyerId: Types.ObjectId;
  paymentType: TOrderPaymentType;
  /** Amount we asked Stripe to charge (USD). */
  amount: number;
  /** Amount Stripe actually captured (USD). Refunds are capped by this. */
  capturedAmount?: number | null;
  currency: string;
  gateway: "STRIPE";
  transactionId: string;
  status: TOrderPaymentStatus;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  checkoutUrl?: string | null;
  checkoutExpiresAt?: Date | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
  /** Sum of refunds queued (PENDING + SUCCEEDED). Caps new refunds so we never over-refund. */
  refundRequestedAmount: number;
  /** Sum of refunds Stripe confirmed. */
  refundedAmount: number;
  refunds: IPaymentRefund[];
  /** Hold deposit kept because the buyer did not show up before the hold expired. */
  depositForfeitedAt?: Date | null;
  gatewayResponse?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IShippingAddressInput {
  name: string;
  phone: string;
  email?: string | null;
  address: string;
}

export interface ICheckoutItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  selectedSize: number | string;
}

export interface ICheckoutRedirects {
  successUrl?: string;
  cancelUrl?: string;
}

export interface IPlaceOrderPayload extends ICheckoutRedirects {
  shippingAddress: IShippingAddressInput;
  orderItems: ICheckoutItemInput[];
}

export interface IBuyNowPayload extends ICheckoutRedirects {
  productId: string;
  selectedSize: number | string;
  quantity?: number;
  shippingAddress?: IShippingAddressInput;
}

export interface IHoldDepositPayload extends ICheckoutRedirects {
  retailerId: string;
  productId: string;
  selectedSize: number | string;
  quantity?: number;
  holdingTimeHours?: number;
  depositAmount?: number;
}

/** What every checkout endpoint returns to the app. */
export interface ICheckoutResult {
  orderId: Types.ObjectId;
  orderNumber: string;
  paymentId: Types.ObjectId;
  paymentType: TOrderPaymentType;
  transactionId: string;
  paymentLink: string;
  expiresAt: Date | null;
  amountDue: number;
  paymentBreakdown: Record<string, number>;
}
