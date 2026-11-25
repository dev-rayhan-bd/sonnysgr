import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import AdminAnalyticsService from "./adminAnalytics.service";

type TAnalyticsFn = (query: Record<string, unknown>) => Promise<unknown>;

const respond = (fn: TAnalyticsFn, message: string) =>
  catchAsync(async (req, res) => {
    const result = await fn(req.query as Record<string, unknown>);
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, message, data: result });
  });

const AdminAnalyticsController = {
  getGmv: respond(AdminAnalyticsService.getGmv, "GMV analytics retrieved successfully."),
  getCommission: respond(AdminAnalyticsService.getCommission, "Platform commission retrieved successfully."),
  getTopCities: respond(AdminAnalyticsService.getTopCities, "Top cities retrieved successfully."),
  getTopBrands: respond(AdminAnalyticsService.getTopBrands, "Top brands retrieved successfully."),
  getTopStores: respond(AdminAnalyticsService.getTopStores, "Top stores retrieved successfully."),
  getTopResellers: respond(AdminAnalyticsService.getTopResellers, "Top resellers retrieved successfully."),
};

export default AdminAnalyticsController;
