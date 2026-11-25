import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import QueryBuilder from "../../../builder/QueryBuilder";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import RetailerModel from "../../Retailer/Retailer.model";
import { StorePlanPurchaseModel } from "../SubscriptionPayment.model";

const DAY_MS = 24 * 60 * 60 * 1000;

const planLookup = (localField: string, as: string) => ({
  $lookup: {
    from: "storeplans",
    let: { planId: `$${localField}` },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$planId"] } } },
      { $project: { planType: 1, title: 1, description: 1, price: 1, durationDays: 1, features: 1 } },
    ],
    as,
  },
});

/**
 * Sub-Service dedicated to reading a retailer's plan status and purchase history.
 */
export class StorePlanQuerySubService {
  /**
   * Active subscription + active boost for the authenticated retailer (single aggregation trip).
   */
  static async getMyPlanStatus(userDetails: IJwtPayload) {
    const [retailer] = await RetailerModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userDetails.profileId) } },
      planLookup("subscription", "subscriptionPlan"),
      planLookup("boost.planId", "boostPlan"),
      { $unwind: { path: "$subscriptionPlan", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$boostPlan", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          subscriptionPlan: 1,
          subscriptionStartDate: 1,
          subscriptionEndDate: 1,
          boostPlan: 1,
          boost: 1,
        },
      },
    ]);

    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer profile not found.");
    }

    return {
      subscription: StorePlanQuerySubService.toWindow(
        retailer.subscriptionPlan,
        retailer.subscriptionStartDate,
        retailer.subscriptionEndDate
      ),
      boost: StorePlanQuerySubService.toWindow(
        retailer.boostPlan,
        retailer.boost?.startDate,
        retailer.boost?.endDate
      ),
    };
  }

  /**
   * Paginated purchase history. Filters: ?planType, ?status. Sort default -createdAt.
   */
  static async getPurchaseHistory(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const queryBuilder = new QueryBuilder(
      StorePlanPurchaseModel.find({
        retailerId: new mongoose.Types.ObjectId(userDetails.profileId),
      }),
      query
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await queryBuilder.modelQuery.select("-__v -stripeSessionId").lean();
    const meta = await queryBuilder.countTotal();
    return { meta, data };
  }

  private static toWindow(plan: unknown, startDate?: Date | null, endDate?: Date | null) {
    const now = Date.now();
    const isActive = Boolean(endDate && new Date(endDate).getTime() > now);
    const daysRemaining = isActive
      ? Math.ceil((new Date(endDate as Date).getTime() - now) / DAY_MS)
      : 0;

    return {
      isActive,
      plan: plan || null,
      startDate: startDate || null,
      endDate: endDate || null,
      daysRemaining,
    };
  }
}
