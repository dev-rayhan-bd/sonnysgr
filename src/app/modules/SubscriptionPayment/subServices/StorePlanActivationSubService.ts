import mongoose from "mongoose";
import RetailerModel from "../../Retailer/Retailer.model";
import { StorePlanPurchaseModel } from "../SubscriptionPayment.model";
import { IStorePlanPurchase } from "../SubscriptionPayment.interface";
import { STORE_PLAN_PURCHASE_STATUS, STORE_PLAN_TYPE } from "../SubscriptionPayment.constant";

const DAY_MS = 24 * 60 * 60 * 1000;

interface IRetailerPlanDates {
  subscriptionEndDate?: Date | null;
  boost?: { endDate?: Date | null };
}

/**
 * Sub-Service dedicated to activating / failing plan purchases from Stripe webhook events.
 * Idempotent: replayed webhooks for an already-settled purchase are ignored.
 */
export class StorePlanActivationSubService {
  /**
   * checkout.session.completed -> mark purchase PAID and extend the retailer's
   * subscription or boost window. Buying while a plan is still active stacks the time.
   */
  static async activatePurchase(params: {
    purchaseId: string;
    stripePaymentIntentId?: string | null;
  }) {
    if (!mongoose.Types.ObjectId.isValid(params.purchaseId)) return null;

    const session = await mongoose.startSession();
    try {
      let activated: IStorePlanPurchase | null = null;

      await session.withTransaction(async () => {
        const purchase = (await StorePlanPurchaseModel.findOne({
          _id: params.purchaseId,
          status: STORE_PLAN_PURCHASE_STATUS.PENDING,
        }).session(session)) as (IStorePlanPurchase & mongoose.Document) | null;

        if (!purchase) return; // already processed or unknown

        const retailer = (await RetailerModel.findById(purchase.retailerId)
          .select("subscriptionEndDate boost")
          .session(session)
          .lean()) as IRetailerPlanDates | null;

        if (!retailer) return;

        const now = new Date();
        const isBoost = purchase.planType === STORE_PLAN_TYPE.BOOST;
        const currentEnd = isBoost ? retailer.boost?.endDate : retailer.subscriptionEndDate;
        const startDate = currentEnd && currentEnd > now ? new Date(currentEnd) : now;
        const endDate = new Date(startDate.getTime() + purchase.planSnapshot.durationDays * DAY_MS);

        const retailerUpdate = isBoost
          ? {
              "boost.planId": purchase.planId,
              // keep the original start while the boost is continuous
              "boost.startDate": currentEnd && currentEnd > now ? undefined : startDate,
              "boost.endDate": endDate,
            }
          : {
              subscription: purchase.planId,
              subscriptionStartDate: currentEnd && currentEnd > now ? undefined : startDate,
              subscriptionEndDate: endDate,
            };

        // drop undefined keys so a continuous plan keeps its original start date
        const setStage = Object.fromEntries(
          Object.entries(retailerUpdate).filter(([, value]) => value !== undefined)
        );

        await RetailerModel.updateOne({ _id: purchase.retailerId }, { $set: setStage }, { session });

        await StorePlanPurchaseModel.updateOne(
          { _id: purchase._id },
          {
            $set: {
              status: STORE_PLAN_PURCHASE_STATUS.PAID,
              paidAt: now,
              startDate,
              endDate,
              ...(params.stripePaymentIntentId
                ? { stripePaymentIntentId: params.stripePaymentIntentId }
                : {}),
            },
          },
          { session }
        );

        activated = { ...purchase.toObject(), startDate, endDate };
      });

      return activated;
    } finally {
      await session.endSession();
    }
  }

  /**
   * checkout.session.expired / async_payment_failed -> close the pending purchase
   */
  static async failPurchase(params: { purchaseId: string; expired: boolean }) {
    if (!mongoose.Types.ObjectId.isValid(params.purchaseId)) return null;

    return await StorePlanPurchaseModel.findOneAndUpdate(
      { _id: params.purchaseId, status: STORE_PLAN_PURCHASE_STATUS.PENDING },
      {
        $set: {
          status: params.expired
            ? STORE_PLAN_PURCHASE_STATUS.EXPIRED
            : STORE_PLAN_PURCHASE_STATUS.FAILED,
        },
      },
      { new: true }
    ).lean();
  }
}
