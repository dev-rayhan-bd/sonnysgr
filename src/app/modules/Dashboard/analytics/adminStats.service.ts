import { Model } from "mongoose";
import AuthModel from "../../auth/auth.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import { OrderModel } from "../../Order/Order.model";
import OfferModel from "../../Offer/Offer.model";
import PayoutModel from "../../Retailer/Payout.model";
import { SupportTicketModel } from "../../Support/Support.model";
import ReportModel from "../../Report/Report.model";
import DropModel from "../../Drop/Drop.model";
import { DISPUTE_MATCH, FRAUD_REPORT_TITLES, GMV_ORDER_MATCH, OPEN_TICKET_STATUSES } from "../dashboard.shared";

type TCount = { _id: string | null; count: number; amount?: number };

const toMap = (rows: TCount[]) =>
  rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r._id ?? "Unknown"]: r.count }), {});

const approvalSummary = (model: Model<any>) =>
  model.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: { $sum: { $cond: ["$isApproved", 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$approvalStatus", "Rejected"] }, 1, 0] } },
      },
    },
  ]);

/** GET /dashboard/dashboard-stat — platform-wide KPIs for the admin home screen. */
const getDashboardStats = async () => {
  const [
    usersByRole,
    usersByStatus,
    [stores],
    [resellers],
    [orders],
    deals,
    payouts,
    openTickets,
    openDisputes,
    unsolvedReports,
    fraudAlerts,
    pendingDrops,
  ] = await Promise.all([
    AuthModel.aggregate<TCount>([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    AuthModel.aggregate<TCount>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    approvalSummary(RetailerModel),
    approvalSummary(ResellerModel),
    OrderModel.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "Completed"] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $in: ["$orderStatus", ["Cancelled", "Rejected"]] }, 1, 0] } },
          gmv: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", GMV_ORDER_MATCH.paymentStatus] },
                    { $not: [{ $in: ["$orderStatus", GMV_ORDER_MATCH.orderStatus.$nin] }] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]),
    OfferModel.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: "$offerType",
          deals: { $sum: 1 },
          volume: { $sum: "$currentOfferAmount" },
          platformFee: { $sum: "$platformFeeAmount" },
        },
      },
    ]),
    PayoutModel.aggregate<TCount>([{ $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }]),
    SupportTicketModel.countDocuments({ status: { $in: OPEN_TICKET_STATUSES } }),
    SupportTicketModel.countDocuments({ ...DISPUTE_MATCH, status: { $in: OPEN_TICKET_STATUSES } }),
    ReportModel.countDocuments({ isSolved: false }),
    ReportModel.countDocuments({ isSolved: false, title: { $in: FRAUD_REPORT_TITLES } }),
    DropModel.countDocuments({ approvalStatus: { $in: ["Pending", null] } }),
  ]);

  const roles = toMap(usersByRole);
  const dealVolume = deals.reduce((s: number, d: any) => s + d.volume, 0);
  const platformFee = deals.reduce((s: number, d: any) => s + d.platformFee, 0);
  const pendingPayout = payouts.find((p) => p._id === "PENDING");

  return {
    users: {
      total: usersByRole.reduce((s, r) => s + r.count, 0),
      buyers: roles.Buyer || 0,
      retailers: roles.Retailer || 0,
      resellers: roles.Reseller || 0,
      byStatus: toMap(usersByStatus),
    },
    stores: {
      total: stores?.total || 0,
      approved: stores?.approved || 0,
      rejected: stores?.rejected || 0,
      pendingApproval: (stores?.total || 0) - (stores?.approved || 0) - (stores?.rejected || 0),
    },
    resellers: {
      total: resellers?.total || 0,
      approved: resellers?.approved || 0,
      pendingApproval: (resellers?.total || 0) - (resellers?.approved || 0),
    },
    orders: {
      total: orders?.totalOrders || 0,
      completed: orders?.completedOrders || 0,
      cancelled: orders?.cancelledOrders || 0,
    },
    revenue: {
      orderGmv: orders?.gmv || 0,
      dealVolume,
      totalGmv: (orders?.gmv || 0) + dealVolume,
      platformCommission: platformFee,
      dealsByType: deals,
    },
    payouts: {
      pendingCount: pendingPayout?.count || 0,
      pendingAmount: pendingPayout?.amount || 0,
      byStatus: payouts,
    },
    moderation: {
      openSupportTickets: openTickets,
      openDisputes,
      unsolvedReports,
      fraudAlerts,
      pendingDrops,
    },
  };
};

export default getDashboardStats;
