import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import AdminNotificationService from "./adminNotification.service";

const sendNotificationToUser = catchAsync(async (req, res) => {
  const result = await AdminNotificationService.sendNotificationToUser(req.body);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Notification sent successfully.", data: result });
});

const getAdminNotifications = catchAsync(async (req, res) => {
  const result = await AdminNotificationService.getAdminNotifications(req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin notifications retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const markAdminNotificationSeen = catchAsync(async (req, res) => {
  const result = await AdminNotificationService.markAdminNotificationSeen(req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Notification marked as seen.", data: result });
});

const markAllAdminNotificationsSeen = catchAsync(async (_req, res) => {
  const result = await AdminNotificationService.markAllAdminNotificationsSeen();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "All notifications marked as seen.", data: result });
});

const deleteAdminNotification = catchAsync(async (req, res) => {
  await AdminNotificationService.deleteAdminNotification(req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Notification deleted successfully.", data: null });
});

const AdminNotificationController = {
  sendNotificationToUser,
  getAdminNotifications,
  markAdminNotificationSeen,
  markAllAdminNotificationsSeen,
  deleteAdminNotification,
};

export default AdminNotificationController;
