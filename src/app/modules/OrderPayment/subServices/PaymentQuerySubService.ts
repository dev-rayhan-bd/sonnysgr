import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import AggregationBuilder from "../../../builder/AggregationBuilder";
import OrderPaymentModel from "../OrderPayment.model";
import { OrderModel } from "../../Order/Order.model";
import { ORDER_PAYMENT_STATUS } from "../OrderPayment.constant";

/** Fields the app may see. Never expose gatewayResponse or Stripe ids. */
const PUBLIC_PAYMENT_PROJECTION = {
  paymentType: 1,
  amount: 1,
  currency: 1,
  status: 1,
  transactionId: 1,
  checkoutUrl: 1,
  checkoutExpiresAt: 1,
  paidAt: 1,
  failedAt: 1,
  failureReason: 1,
  refundedAmount: 1,
  depositForfeitedAt: 1,
  "refunds.amount": 1,
  "refunds.reason": 1,
  "refunds.status": 1,
  "refunds.requestedAt": 1,
  "refunds.processedAt": 1,
  createdAt: 1,
} as const;

/** Only an open, unexpired checkout gets its link back (for "Continue payment"). */
const withResumableLink = <T extends { status?: string; checkoutUrl?: string | null; checkoutExpiresAt?: Date | null }>(
  payment: T
) => {
  const resumable =
    payment.status === ORDER_PAYMENT_STATUS.PENDING &&
    !!payment.checkoutUrl &&
    !!payment.checkoutExpiresAt &&
    new Date(payment.checkoutExpiresAt).getTime() > Date.now();
  return { ...payment, checkoutUrl: resumable ? payment.checkoutUrl : null, canResumePayment: resumable };
};

export class PaymentQuerySubService {
  /** Polled by the app after returning from Stripe. */
  static async getPaymentStatus(buyerId: string, orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid order id.");
    }

    const [order, payment] = await Promise.all([
      OrderModel.findOne({ _id: orderId, buyerId })
        .select(
          "orderNumber orderType orderStatus paymentStatus totalAmount partialPayment holdingTime holdingStartTime holdingEndTime pickupVerificationCode"
        )
        .lean(),
      OrderPaymentModel.findOne({ orderId, buyerId }).sort({ createdAt: -1 }).select(PUBLIC_PAYMENT_PROJECTION).lean(),
    ]);

    if (!order) {
      throw new AppError(StatusCodes.NOT_FOUND, "Order not found.");
    }

    return { order, payment: payment ? withResumableLink(payment) : null };
  }

  /** Buyer billing history: paginated, newest first. */
  static async getMyPayments(buyerId: string, query: Record<string, unknown>) {
    const { meta, data } = await new AggregationBuilder(OrderPaymentModel, query, {
      buyerId: new mongoose.Types.ObjectId(buyerId),
    })
      .filter({ status: "string", paymentType: "string" })
      .search(["transactionId"])
      .sort()
      .execute([
        {
          $lookup: {
            from: OrderModel.collection.name,
            localField: "orderId",
            foreignField: "_id",
            as: "order",
            pipeline: [{ $project: { orderNumber: 1, orderType: 1, orderStatus: 1, totalAmount: 1 } }],
          },
        },
        { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
        { $project: { ...PUBLIC_PAYMENT_PROJECTION, orderId: 1, order: 1 } },
      ]);

    return { meta, data: data.map((p) => withResumableLink(p)) };
  }
}
