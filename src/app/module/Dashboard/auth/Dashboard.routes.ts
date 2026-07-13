import express from "express";
import validateRequest from "../../../middlewares/validateRequest";
import { auth, authorizeUser } from "../../../middlewares/auth";
import {
  adminLoginValidation,
  changeAdminPasswordValidation,
  createAdminvalidation,
  editProfilevalidation,
} from "./Dashboard.validation";
import DashboardController from "./Dashboard.controller";
import AuthValidations from "../../auth/auth.validation";
import { uploadProfile } from "../../../middlewares/multerMiddleware";

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
  validateRequest(AuthValidations.sendVerifyCodeValidation),
  DashboardController.adminSendVerifyCode,
);

dashboardRouter.post(
  "/admin-reset-password",
  authorizeUser,
  validateRequest(AuthValidations.resetPasswordValidation),
  DashboardController.adminResetPassword,
);

dashboardRouter.patch(
  "/edit-admin-profile",
  // auth(["Super_Admin"]),
  authorizeUser,
  uploadProfile.single("admin-image"),
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
  // auth(["Super_Admin"]), only super admin can block a admin
  // validateRequest(adminLoginValidation),
  DashboardController.blockAdmin,
);

dashboardRouter.get(
  "/dashboard-stat",
  // auth(["Super_Admin"]),
  // validateRequest(adminLoginValidation),
  DashboardController.dashboardStat,
);

export default dashboardRouter;
