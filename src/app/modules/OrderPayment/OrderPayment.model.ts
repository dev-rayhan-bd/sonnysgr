import { model, Schema, models } from "mongoose";
import { IOrderPayment } from "./OrderPayment.interface";

const OrderPaymentSchema = new Schema<IOrderPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    gateway: {
      type: String,
      enum: ["STRIPE"],
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const OrderPaymentModel = models.OrderPayment || model<IOrderPayment>("OrderPayment", OrderPaymentSchema);
export default OrderPaymentModel;
