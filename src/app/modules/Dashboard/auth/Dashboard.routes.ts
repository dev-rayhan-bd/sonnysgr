import express from "express";
import validateRequest from "../../../middleware/validateRequest";
import { auth, authorizeUser } from "../../../middleware/auth";
import {
  adminLoginValidation,
  adminIdParamValidation,
  adminResetPasswordValidation,
  changeAdminPasswordValidation,
  createAdminvalidation,
  editProfilevalidation,
} from "./Dashboard.validation";
import DashboardController from "./Dashboard.controller";
import AuthValidations from "../../auth/auth.validation";
import { uploadAdminImage } from "../../../middleware/multerMiddleware";
import adminManagementRouter from "../admins/adminManagement.routes";
import adminAnalyticsRouter from "../analytics/adminAnalytics.routes";
import adminFinanceRouter from "../finance/adminFinance.routes";
import adminDisputeRouter from "../disputes/adminDispute.routes";
import adminModerationRouter from "../moderation/adminModeration.routes";
import adminNotificationRouter from "../notifications/adminNotification.routes";
import adminSearchRouter from "../search/adminSearch.routes";

const dashboardRouter = express.Router();

dashboardRouter.post(
  "/create-admin",
  auth(["Super_Admin"]),
  validateRequest(createAdminvalidation),
  DashboardController.adminRegister,
);

dashboardRouter.post(
  "/login-admin",
  // auth(["Super_Admin"]),
  validateRequest(adminLoginValidation),
  DashboardController.adminLogin,
);

dashboardRouter.get(
  "/profile",
  authorizeUser,
  DashboardController.getMyProfile,
);

dashboardRouter.post(
  "/forgot-password",
  validateRequest(AuthValidations.sendVerifyCodeValidation),
  DashboardController.forgotPassword,
);

dashboardRouter.post(
  "/admin-verify-code",
  validateRequest(AuthValidations.verifyCodeValidation),
  DashboardController.adminVerifyCode,
);

dashboardRouter.post(
  "/admin-send-verify-code",
  // authorizeUser,
  validateRequest(AuthValidations.sendVerifyCodeValidation),
  DashboardController.adminSendVerifyCode,
);

// Public: authorised by the short-lived resetToken returned from /admin-verify-code
dashboardRouter.post(
  "/admin-reset-password",
  validateRequest(adminResetPasswordValidation),
  DashboardController.adminResetPassword,
);

dashboardRouter.patch(
  "/edit-admin-profile",
  // auth(["Super_Admin"]),
  authorizeUser,
  uploadAdminImage.single("admin-image"),
  validateRequest(editProfilevalidation),
  DashboardController.editAdminProfile,
);

dashboardRouter.patch(
  "/change-admin-password",
  // auth(["Super_Admin"]),
  authorizeUser,
  validateRequest(changeAdminPasswordValidation),
  DashboardController.changeAdminPassword,
);

dashboardRouter.delete(
  "/delete-admin",
  // auth(["Super_Admin"]),
  authorizeUser,
  // validateRequest(adminLoginValidation),
  DashboardController.deleteAdminAccount,
);

dashboardRouter.post(
  "/block-admin/:id",
  auth(["Super_Admin"]), // only super admin can block a admin
  validateRequest(adminIdParamValidation),
  DashboardController.blockAdmin,
);

dashboardRouter.get(
  "/dashboard-stat",
  auth(["Admin", "Super_Admin"]),
  DashboardController.dashboardStat,
);

// Admin panel feature routers (Module 19 / 22.2)
dashboardRouter.use("/", adminManagementRouter);
dashboardRouter.use("/analytics", adminAnalyticsRouter);
dashboardRouter.use("/finance", adminFinanceRouter);
dashboardRouter.use("/disputes", adminDisputeRouter);
dashboardRouter.use("/moderation", adminModerationRouter);
dashboardRouter.use("/notifications", adminNotificationRouter);
dashboardRouter.use("/search", adminSearchRouter);

import adminUserRouter from "../users/users.route";
dashboardRouter.use("/users", adminUserRouter);

export default dashboardRouter;
