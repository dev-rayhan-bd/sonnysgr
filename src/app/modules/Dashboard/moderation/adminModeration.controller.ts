import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import AdminReportModerationService from "./adminReportModeration.service";
import AdminContentModerationService from "./adminContentModeration.service";

type TListFn = (query: Record<string, unknown>) => Promise<{ meta: any; data: unknown }>;

const list = (fn: TListFn, message: string) =>
  catchAsync(async (req, res) => {
    const result = await fn(req.query as Record<string, unknown>);
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, message, meta: result.meta, data: result.data });
  });

const getReportDetails = catchAsync(async (req, res) => {
  const result = await AdminReportModerationService.getReportDetails(req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Report retrieved successfully.", data: result });
});

const resolveReport = catchAsync(async (req, res) => {
  const result = await AdminReportModerationService.resolveReport(req.params.id as string, req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Report updated successfully.", data: result });
});

const deleteReview = catchAsync(async (req, res) => {
  await AdminContentModerationService.deleteReview(req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Review removed successfully.", data: null });
});

const reviewDrop = catchAsync(async (req, res) => {
  const result = await AdminContentModerationService.reviewDrop(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: req.body.action === "Approve" ? "Drop approved successfully." : "Drop rejected successfully.",
    data: result,
  });
});

const AdminModerationController = {
  getReports: list(AdminReportModerationService.getReports, "Reports retrieved successfully."),
  getFraudAlerts: list(AdminReportModerationService.getFraudAlerts, "Fraud alerts retrieved successfully."),
  getReportDetails,
  resolveReport,
  getReviews: list(AdminContentModerationService.getReviews, "Reviews retrieved successfully."),
  deleteReview,
  getDrops: list(AdminContentModerationService.getDrops, "Drops retrieved successfully."),
  reviewDrop,
};

export default AdminModerationController;
