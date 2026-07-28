import express from "express";
import { auth } from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import UsersValidations from "./users.validation";
import userManagementController from "./user.controller";

const adminUserRouter = express.Router();

adminUserRouter.get(
  "/get-all-users",
  auth(["Admin", "Super_Admin"]),
  userManagementController.getAllUsers
);

adminUserRouter.get(
  "/get-single-user/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.getSingleUser
);

adminUserRouter.patch(
  "/update-user-status/:id",
  auth(["Admin", "Super_Admin"]),
  validateRequest(UsersValidations.updateUserStatusValidationSchema),
  userManagementController.updateUserStatus
);

adminUserRouter.post(
  "/retailer/approve-store/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.approveRetailerStore
);

adminUserRouter.post(
  "/retailer/suspend-store/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.suspendStore
);

adminUserRouter.post(
  "/retailer/reactivate-store/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.reactivateStore
);

adminUserRouter.get(
  "/retailer/documents/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.getRetailerDocuments
);

adminUserRouter.get(
  "/retailer/analytics/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.getRetailerAnalytics
);

adminUserRouter.post(
  "/reseller/verify/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.verifyReseller
);

adminUserRouter.get(
  "/reseller/inventory/:id",
  auth(["Admin", "Super_Admin"]),
  userManagementController.getResellerInventory
);

adminUserRouter.patch(
  "/reseller/adjust-trust-score/:id",
  auth(["Admin", "Super_Admin"]),
  validateRequest(UsersValidations.adjustTrustScoreValidationSchema),
  userManagementController.adjustResellerTrustScore
);

export default adminUserRouter;
