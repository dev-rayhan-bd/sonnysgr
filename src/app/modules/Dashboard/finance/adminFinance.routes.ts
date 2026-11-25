import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import { ADMIN_ROLES } from "../dashboard.shared";
import AdminFinanceController from "./adminFinance.controller";
import AdminFinanceValidations from "./adminFinance.validation";

const adminFinanceRouter = express.Router();

adminFinanceRouter.get(
  "/transactions",
  auth(ADMIN_ROLES),
  validateRequest(AdminFinanceValidations.transactionsValidation),
  AdminFinanceController.getTransactions,
);

adminFinanceRouter.get(
  "/refunds",
  auth(ADMIN_ROLES),
  validateRequest(AdminFinanceValidations.refundsValidation),
  AdminFinanceController.getRefunds,
);

adminFinanceRouter.get(
  "/payouts",
  auth(ADMIN_ROLES),
  validateRequest(AdminFinanceValidations.payoutsValidation),
  AdminFinanceController.getPayouts,
);

adminFinanceRouter.patch(
  "/payouts/:id/process",
  auth(ADMIN_ROLES),
  validateRequest(AdminFinanceValidations.processPayoutValidation),
  AdminFinanceController.processPayout,
);

export default adminFinanceRouter;
