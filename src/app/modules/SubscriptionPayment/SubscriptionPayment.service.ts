import ApiError from "../../../error/ApiError";
import SubscriptionPaymentModel from "./SubscriptionPayment.model";

const stripeSubscriptionPaymentService = async () => {
  // check which plan
  // if individual plan
  // only this user's subscription will be updated.
  // if Couple plan
  // both user's subscription will be updated
};

export const SubscriptionPaymentServices = {
  stripeSubscriptionPaymentService,
};

export default SubscriptionPaymentServices;
