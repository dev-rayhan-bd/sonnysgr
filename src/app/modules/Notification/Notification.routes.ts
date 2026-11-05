import express from "express";
import { authorizeUser } from "../../middleware/auth";
import NotificationController from "./Notification.controller";

const notificationRouter = express.Router();

notificationRouter.get(
  "/get-all-notification",
  authorizeUser,
  NotificationController.getAllNotification
);

notificationRouter.patch(
  "/make-notification-seen/:id",
  authorizeUser,
  NotificationController.makeNotificationSeen
);

notificationRouter.patch(
  "/make-all-seen",
  authorizeUser,
  NotificationController.makeAllNotificationSeen
);

notificationRouter.delete(
  "/delete-notification/:id",
  authorizeUser,
  NotificationController.deleteNotification
);

// Dashboard / Admin notifications
notificationRouter.get(
  "/get-admin-notification",
  NotificationController.getAllAdminNotification
);

notificationRouter.delete(
  "/delete-admin-notification/:id",
  NotificationController.deleteAdminNotification
);

notificationRouter.patch(
  "/make-admin-notification-seen/:id",
  NotificationController.makeAdminNotificationSeen
);

export default notificationRouter;
