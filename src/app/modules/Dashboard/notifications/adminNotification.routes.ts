import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import { ADMIN_ROLES } from "../dashboard.shared";
import AdminNotificationController from "./adminNotification.controller";
import AdminNotificationValidations from "./adminNotification.validation";

const adminNotificationRouter = express.Router();
const v = AdminNotificationValidations;

// Admin → user notification
adminNotificationRouter.post("/send", auth(ADMIN_ROLES), validateRequest(v.sendNotificationValidation), AdminNotificationController.sendNotificationToUser);

// Admin inbox (new tickets, reports, store applications, …)
adminNotificationRouter.get("/", auth(ADMIN_ROLES), validateRequest(v.adminNotificationsListValidation), AdminNotificationController.getAdminNotifications);
adminNotificationRouter.patch("/seen-all", auth(ADMIN_ROLES), AdminNotificationController.markAllAdminNotificationsSeen);
adminNotificationRouter.patch("/:id/seen", auth(ADMIN_ROLES), validateRequest(v.idValidation), AdminNotificationController.markAdminNotificationSeen);
adminNotificationRouter.delete("/:id", auth(ADMIN_ROLES), validateRequest(v.idValidation), AdminNotificationController.deleteAdminNotification);

export default adminNotificationRouter;
