import mongoose from "mongoose";
import ApiError from "../../../../error/ApiError";
import AggregationBuilder from "../../../builder/AggregationBuilder";
import ReportModel from "../../Report/Report.model";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import { OrderModel } from "../../Order/Order.model";
import { FRAUD_REPORT_TITLES, dateRangeMatch, lookupOne } from "../dashboard.shared";

type TQuery = Record<string, unknown>;

const reportLookups = () => [
  ...lookupOne(BuyerModel.collection.name, "buyerId", "reporter", { name: 1, image: 1, phone: 1 }),
  ...lookupOne(RetailerModel.collection.name, "retailerId", "store", { name: 1, image: 1, address: 1 }),
  ...lookupOne(OrderModel.collection.name, "orderId", "order", { orderNumber: 1, orderStatus: 1, totalAmount: 1 }),
];

const listReports = (query: TQuery, baseMatch: Record<string, unknown>) =>
  new AggregationBuilder(ReportModel, query, { ...baseMatch, ...dateRangeMatch(query) })
    .filter({ isSolved: "boolean", isUrgent: "boolean", title: "string", retailerId: "objectId" })
    .search(["title", "content"])
    .sort()
    .execute(reportLookups());

/** Abuse / counterfeit / service reports filed by buyers against stores. */
const getReports = async (query: TQuery) => listReports(query, {});

/**
 * Fraud alerts = reports titled "Fraud or Scam" or "Fake or Counterfeit Product".
 * Unsolved only unless `isSolved` is passed explicitly.
 */
const getFraudAlerts = async (query: TQuery) =>
  listReports(query.isSolved === undefined ? { ...query, isSolved: "false" } : query, {
    title: { $in: FRAUD_REPORT_TITLES },
  });

const getReportDetails = async (id: string) => {
  const [report] = await ReportModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    ...reportLookups(),
  ]);
  if (!report) throw new ApiError(404, "Report not found");
  return report;
};

const resolveReport = async (id: string, payload: { resolution: string; isSolved?: boolean }) => {
  const report = await ReportModel.findByIdAndUpdate(
    id,
    { $set: { resolution: payload.resolution, isSolved: payload.isSolved ?? true } },
    { new: true, runValidators: true },
  ).lean();
  if (!report) throw new ApiError(404, "Report not found");
  return report;
};

const AdminReportModerationService = { getReports, getFraudAlerts, getReportDetails, resolveReport };

export default AdminReportModerationService;
