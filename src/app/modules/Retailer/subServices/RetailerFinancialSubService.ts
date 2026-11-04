import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import { OrderItemModel } from "../../Order/Order.model";
import RetailerModel from "../Retailer.model";
import PayoutModel from "../Payout.model";
import QueryBuilder from "../../../builder/QueryBuilder";

/**
 * Sub-Service dedicated to Retailer Financials, Earnings Dashboard & Payout Engine
 */
export class RetailerFinancialSubService {
  /**
   * Get real-time financial metrics, earnings, and withdrawal balance for retailer
   * Optimized with native MongoDB $facet aggregation (zero .populate)
   */
  static async getFinancialOverview(userDetails: IJwtPayload) {
    const { profileId } = userDetails;
    const retailerObjectId = new mongoose.Types.ObjectId(profileId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run parallel single-trip aggregations for Order Sales & Payout Balances
    const [salesAggregation, payoutAggregation] = await Promise.all([
      OrderItemModel.aggregate([
        { $match: { retailerId: retailerObjectId } },
        {
          $facet: {
            allTimeCompleted: [
              { $match: { status: "Completed" } },
              { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
            ],
            todayCompleted: [
              { $match: { status: "Completed", createdAt: { $gte: todayStart } } },
              { $group: { _id: null, total: { $sum: "$totalPrice" } } },
            ],
            monthCompleted: [
              { $match: { status: "Completed", createdAt: { $gte: monthStart } } },
              { $group: { _id: null, total: { $sum: "$totalPrice" } } },
            ],
            escrowPending: [
              {
                $match: {
                  status: {
                    $in: [
                      "Ready_For_Pickup",
                      "Processing",
                      "Placed",
                      "Pending",
                      "Payment_Completed",
                      "Needs Action",
                      "Hold",
                      "Holding",
                    ],
                  },
                },
              },
              { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
            ],
          },
        },
      ]),
      PayoutModel.aggregate([
        { $match: { retailerId: retailerObjectId } },
        {
          $facet: {
            completedPayouts: [
              { $match: { status: "COMPLETED" } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ],
            pendingPayouts: [
              { $match: { status: { $in: ["PENDING", "PROCESSING"] } } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ],
          },
        },
      ]),
    ]);

    const salesFacet = salesAggregation[0] || {};
    const payoutFacet = payoutAggregation[0] || {};

    const grossSales = salesFacet.allTimeCompleted?.[0]?.total || 0;
    const completedOrdersCount = salesFacet.allTimeCompleted?.[0]?.count || 0;
    const todayGrossSales = salesFacet.todayCompleted?.[0]?.total || 0;
    const thisMonthGrossSales = salesFacet.monthCompleted?.[0]?.total || 0;
    const pendingEscrowSales = salesFacet.escrowPending?.[0]?.total || 0;
    const pendingOrdersCount = salesFacet.escrowPending?.[0]?.count || 0;

    const totalPaidOut = payoutFacet.completedPayouts?.[0]?.total || 0;
    const pendingPayoutRequests = payoutFacet.pendingPayouts?.[0]?.total || 0;

    // Platform fee calculation: 5%
    const platformFeeRate = 0.05;
    const platformFeeTotal = Math.round(grossSales * platformFeeRate * 100) / 100;
    const netEarnings = Math.round((grossSales - platformFeeTotal) * 100) / 100;

    // Available for withdrawal = Net Earnings - (Already Paid + Currently In Payout Queue)
    const availableBalance = Math.max(
      0,
      Math.round((netEarnings - totalPaidOut - pendingPayoutRequests) * 100) / 100
    );

    return {
      currency: "USD",
      availableBalance,
      summary: {
        grossSales,
        platformFeeRate: "5%",
        platformFeeTotal,
        netEarnings,
        totalPaidOut,
        pendingPayoutRequests,
      },
      liveMetrics: {
        todaySales: todayGrossSales,
        thisMonthSales: thisMonthGrossSales,
        pendingEscrowSales,
        completedOrdersCount,
        pendingOrdersCount,
      },
    };
  }

  /**
   * Get retailer's payout preferences & bank details
   */
  static async getPayoutSettings(userDetails: IJwtPayload) {
    const { profileId } = userDetails;
    const retailer = (await RetailerModel.findById(profileId).lean()) as any;
    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer profile not found.");
    }

    return {
      payoutMethod: retailer.payoutSettings?.payoutMethod || "Bank",
      bankDetails: {
        accountHolderName: retailer.payoutSettings?.accountHolderName || retailer.name,
        bankName: retailer.payoutSettings?.bankName || "",
        accountNumberMasked: retailer.payoutSettings?.accountNumberMasked || "",
        routingNumber: retailer.payoutSettings?.routingNumber || "",
      },
      stripeAccountId: retailer.payoutSettings?.stripeAccountId || "",
    };
  }

  /**
   * Update payout configuration (Bank details / Stripe)
   */
  static async updatePayoutSettings(userDetails: IJwtPayload, payload: any) {
    const { profileId } = userDetails;
    const { payoutMethod = "Bank", bankName, accountNumber, accountHolderName, routingNumber } = payload;

    const masked = accountNumber
      ? `****${String(accountNumber).slice(-4)}`
      : undefined;

    const updateFields: any = {
      "payoutSettings.payoutMethod": payoutMethod,
    };

    if (bankName) updateFields["payoutSettings.bankName"] = bankName;
    if (accountHolderName) updateFields["payoutSettings.accountHolderName"] = accountHolderName;
    if (masked) updateFields["payoutSettings.accountNumberMasked"] = masked;
    if (routingNumber) updateFields["payoutSettings.routingNumber"] = routingNumber;

    const updatedRetailer = await RetailerModel.findByIdAndUpdate(
      profileId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedRetailer) {
      throw new AppError(StatusCodes.NOT_FOUND, "Retailer profile not found.");
    }

    return this.getPayoutSettings(userDetails);
  }

  /**
   * Request withdrawal from available balance
   */
  static async requestPayout(
    userDetails: IJwtPayload,
    payload: { amount: number; payoutMethod?: "Bank" | "Stripe" | "StoreCash" }
  ) {
    const { profileId } = userDetails;
    const requestedAmount = Number(payload.amount);

    if (!requestedAmount || requestedAmount < 10) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Minimum withdrawal amount is $10.00.");
    }

    // 1. Verify available balance
    const overview = await this.getFinancialOverview(userDetails);
    if (requestedAmount > overview.availableBalance) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Insufficient available balance ($${overview.availableBalance}) for requested withdrawal ($${requestedAmount}).`
      );
    }

    // 2. Fetch current payout settings
    const settings = await this.getPayoutSettings(userDetails);

    // 3. Create Payout record atomically
    const payout = await PayoutModel.create({
      retailerId: new mongoose.Types.ObjectId(profileId),
      amount: requestedAmount,
      currency: "USD",
      payoutMethod: payload.payoutMethod || settings.payoutMethod,
      accountDetails: {
        accountHolderName: settings.bankDetails.accountHolderName,
        bankName: settings.bankDetails.bankName,
        accountNumberMasked: settings.bankDetails.accountNumberMasked,
        routingNumber: settings.bankDetails.routingNumber,
        stripeAccountId: settings.stripeAccountId,
      },
      status: "PENDING",
      requestedAt: new Date(),
    });

    return payout;
  }

  /**
   * Retailer payout history with QueryBuilder
   */
  static async getPayoutHistory(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const { profileId } = userDetails;

    const queryBuilder = new QueryBuilder(
      PayoutModel.find({ retailerId: new mongoose.Types.ObjectId(profileId) }),
      query
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await queryBuilder.modelQuery;
    const meta = await queryBuilder.countTotal();

    return { meta, data };
  }

  /**
   * Admin processes payout (approve/complete/reject)
   */
  static async adminProcessPayout(
    payoutId: string,
    payload: { status: "COMPLETED" | "REJECTED" | "PROCESSING"; transactionReference?: string; adminNote?: string }
  ) {
    const { status, transactionReference, adminNote } = payload;

    const payout = await PayoutModel.findByIdAndUpdate(
      payoutId,
      {
        $set: {
          status,
          transactionReference: transactionReference || "",
          adminNote: adminNote || "",
          processedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!payout) {
      throw new AppError(StatusCodes.NOT_FOUND, "Payout transaction not found.");
    }

    return payout;
  }
}

