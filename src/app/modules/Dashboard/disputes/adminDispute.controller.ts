import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import AdminDisputeService from "./adminDispute.service";

const adminIdOf = (req: any): string => req.user?.userId;

const getDisputes = catchAsync(async (req, res) => {
  const result = await AdminDisputeService.getDisputes(req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Disputes retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getDisputeDetails = catchAsync(async (req, res) => {
  const result = await AdminDisputeService.getDisputeDetails(req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Dispute retrieved successfully.", data: result });
});

const resolveDispute = catchAsync(async (req, res) => {
  const result = await AdminDisputeService.resolveDispute(req.params.id as string, adminIdOf(req), req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: req.body.status === "Rejected" ? "Dispute rejected successfully." : "Dispute resolved successfully.",
    data: result,
  });
});

const escalateDispute = catchAsync(async (req, res) => {
  const result = await AdminDisputeService.escalateDispute(req.params.id as string, adminIdOf(req), req.body.note);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Dispute escalated successfully.", data: result });
});

const AdminDisputeController = { getDisputes, getDisputeDetails, resolveDispute, escalateDispute };

export default AdminDisputeController;
