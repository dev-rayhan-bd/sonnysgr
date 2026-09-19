import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import NotificationValidations from "./Notification.validation";
import NotificationController from "./Notification.controller";


const notificationRouter = express.Router();


notificationRouter.get("/get-all-notification",
    authorizeUser,
    NotificationController.getAllNotification
);

notificationRouter.patch("/make-notification-seen/:id",
    // authorizeUser,
    NotificationController.makeNotificationSeen
);

notificationRouter.delete("/delete-notification/:id",

    NotificationController.deleteNotification
);

//dashboard

notificationRouter.get("/get-admin-notification",
    // authorizeUser,
    NotificationController.getAllAdminNotification
);

notificationRouter.delete("/delete-admin-notification/:id",
    // authorizeUser,
    NotificationController.deleteAdminNotification
);

notificationRouter.patch("/make-admin-notification-seen/:id",
    // authorizeUser,
    NotificationController.makeAdminNotificationSeen
);


export default notificationRouter;