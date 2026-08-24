import { model, Schema, models } from "mongoose";
import { ISubscriptionPayment, ISubscriptionPlan } from "./SubscriptionPayment.interface";

const SubscriptionSchema = new Schema<ISubscriptionPlan>(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    features: [{ type: String, required: true }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const SubscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    couple: { type: Schema.Types.ObjectId, ref: "Couple", default: null },
    subscription: {
      id: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
      planName: { type: String, required: true },
      planPrice: { type: Number, required: true },
      startDate: { type: Date, required: true },
      expireDate: { type: Date, required: true },
    },
    paymentId: { type: String, required: true },
  },
  { timestamps: true }
);

export const SubscriptionPlanModel = models.SubscriptionPlan || model<ISubscriptionPlan>("SubscriptionPlan", SubscriptionSchema);
export const SubscriptionPaymentModel = models.SubscriptionPayment || model<ISubscriptionPayment>("SubscriptionPayment", SubscriptionPaymentSchema);
export default SubscriptionPaymentModel;
