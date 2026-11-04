import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import AlertSettingsValidations from "./alertSettings.validation";
import AlertSettingsController from "./alertSettings.controller";

const AlertPreferencesRouter = express.Router();

AlertPreferencesRouter.get(
  "/",
  auth(["Buyer"]),
  AlertSettingsController.getAlertPreferences
);

AlertPreferencesRouter.patch(
  "/global",
  auth(["Buyer"]),
  validateRequest(AlertSettingsValidations.updateGlobalAlertsSchema),
  AlertSettingsController.updateGlobalAlerts
);

AlertPreferencesRouter.patch(
  "/store/:retailerId",
  auth(["Buyer"]),
  validateRequest(AlertSettingsValidations.updateStoreAlertsSchema),
  AlertSettingsController.updateStoreAlerts
);

export default AlertPreferencesRouter;
