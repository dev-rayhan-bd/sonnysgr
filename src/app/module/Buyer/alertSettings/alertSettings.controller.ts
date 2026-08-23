import { Request, Response } from "express";
import { AuthRequest } from "../../../../interface/authRequest";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import AlertSettingsServices from "./alertSettings.service";

const getAlertPreferences = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await AlertSettingsServices.getAlertPreferencesService(user.profileId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alert preferences retrieved successfully.",
    data: result,
  });
});

const updateGlobalAlerts = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await AlertSettingsServices.updateGlobalAlertsService(user.profileId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Global alert preferences updated successfully.",
    data: result,
  });
});

const updateStoreAlerts = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const { retailerId } = req.params;
  const result = await AlertSettingsServices.updateStoreAlertsService(user.profileId, retailerId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Store alert preferences updated successfully.",
    data: result,
  });
});

export const AlertSettingsController = {
  getAlertPreferences,
  updateGlobalAlerts,
  updateStoreAlerts,
};
export default AlertSettingsController;
