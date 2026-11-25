import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import QueryBuilder from "../../../builder/QueryBuilder";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import { StorePlanModel } from "../SubscriptionPayment.model";
import { IStorePlan } from "../SubscriptionPayment.interface";
import { STORE_PLAN_SEARCHABLE_FIELDS } from "../SubscriptionPayment.constant";

const ADMIN_ROLES = ["Admin", "Super_Admin"];

/**
 * Sub-Service dedicated to the store plan catalog (subscription + boost plans).
 * Admins manage plans; retailers browse the active ones.
 */
export class StorePlanCatalogSubService {
  static async createPlan(payload: Partial<IStorePlan>) {
    return await StorePlanModel.create(payload);
  }

  static async updatePlan(planId: string, payload: Partial<IStorePlan>) {
    StorePlanCatalogSubService.assertObjectId(planId);

    const plan = await StorePlanModel.findByIdAndUpdate(
      planId,
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();

    if (!plan) {
      throw new AppError(StatusCodes.NOT_FOUND, "Plan not found.");
    }
    return plan;
  }

  /**
   * Plans are soft-deleted (deactivated) because purchases keep referencing them.
   */
  static async deactivatePlan(planId: string) {
    return await StorePlanCatalogSubService.updatePlan(planId, { isActive: false });
  }

  /**
   * List plans. Non-admins only ever see active plans.
   * Supports ?planType=SUBSCRIPTION|BOOST, ?searchTerm, ?sort, ?page, ?limit.
   */
  static async getPlans(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const isAdmin = ADMIN_ROLES.includes(userDetails.role);
    const baseFilter: Record<string, unknown> = isAdmin ? {} : { isActive: true };

    const queryBuilder = new QueryBuilder(StorePlanModel.find(baseFilter), {
      sort: "price",
      ...query,
    })
      .search(STORE_PLAN_SEARCHABLE_FIELDS)
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await queryBuilder.modelQuery;
    const meta = await queryBuilder.countTotal();
    return { meta, data };
  }

  static async getPlanById(userDetails: IJwtPayload, planId: string) {
    StorePlanCatalogSubService.assertObjectId(planId);
    const isAdmin = ADMIN_ROLES.includes(userDetails.role);

    const plan = await StorePlanModel.findOne({
      _id: planId,
      ...(isAdmin ? {} : { isActive: true }),
    }).lean();

    if (!plan) {
      throw new AppError(StatusCodes.NOT_FOUND, "Plan not found.");
    }
    return plan;
  }

  private static assertObjectId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid plan id.");
    }
  }
}
