import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import { ADMIN_ROLES } from "../dashboard.shared";
import AdminManagementController from "./adminManagement.controller";
import AdminManagementValidations from "./adminManagement.validation";

const adminManagementRouter = express.Router();

adminManagementRouter.get(
  "/get-all-admins",
  auth(ADMIN_ROLES),
  validateRequest(AdminManagementValidations.getAllAdminsValidation),
  AdminManagementController.getAllAdmins,
);

adminManagementRouter.get(
  "/admins/:id",
  auth(ADMIN_ROLES),
  validateRequest(AdminManagementValidations.adminIdValidation),
  AdminManagementController.getSingleAdmin,
);

// Role / permission / profile edit — Super_Admin only
adminManagementRouter.patch(
  "/admins/:id",
  auth(["Super_Admin"]),
  validateRequest(AdminManagementValidations.updateAdminValidation),
  AdminManagementController.updateAdmin,
);

adminManagementRouter.delete(
  "/admins/:id",
  auth(["Super_Admin"]),
  validateRequest(AdminManagementValidations.adminIdValidation),
  AdminManagementController.deleteAdmin,
);

export default adminManagementRouter;
