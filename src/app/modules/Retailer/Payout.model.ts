import { model, Schema } from "mongoose";
import { IPayout } from "./Payout.interface";

const PayoutSchema = new Schema<IPayout>(
  {
    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "USD",
    },
    payoutMethod: {
      type: String,
      enum: ["Bank", "Stripe", "StoreCash"],
      required: true,
      default: "Bank",
    },
    accountDetails: {
      accountHolderName: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountNumberMasked: { type: String, default: "" },
      routingNumber: { type: String, default: "" },
      stripeAccountId: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    transactionReference: {
      type: String,
      default: "",
    },
    adminNote: {
      type: String,
      default: "",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const PayoutModel = model<IPayout>("Payout", PayoutSchema);
export default PayoutModel;

