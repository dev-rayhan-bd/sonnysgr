import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import AdminManagementService from "./adminManagement.service";

const actorIdOf = (req: any): string => req.user?.userId;

const getAllAdmins = catchAsync(async (req, res) => {
  const result = await AdminManagementService.getAllAdmins(req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admins retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleAdmin = catchAsync(async (req, res) => {
  const result = await AdminManagementService.getSingleAdmin(req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Admin retrieved successfully.", data: result });
});

const updateAdmin = catchAsync(async (req, res) => {
  const result = await AdminManagementService.updateAdmin(actorIdOf(req), req.params.id as string, req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Admin updated successfully.", data: result });
});

const deleteAdmin = catchAsync(async (req, res) => {
  await AdminManagementService.deleteAdmin(actorIdOf(req), req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Admin deleted successfully.", data: null });
});

const AdminManagementController = { getAllAdmins, getSingleAdmin, updateAdmin, deleteAdmin };

export default AdminManagementController;
