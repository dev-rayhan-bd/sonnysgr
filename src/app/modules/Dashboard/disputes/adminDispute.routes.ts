import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import { ADMIN_ROLES } from "../dashboard.shared";
import AdminDisputeController from "./adminDispute.controller";
import AdminDisputeValidations from "./adminDispute.validation";

const adminDisputeRouter = express.Router();

adminDisputeRouter.get(
  "/",
  auth(ADMIN_ROLES),
  validateRequest(AdminDisputeValidations.disputesListValidation),
  AdminDisputeController.getDisputes,
);

adminDisputeRouter.get(
  "/:id",
  auth(ADMIN_ROLES),
  validateRequest(AdminDisputeValidations.disputeIdValidation),
  AdminDisputeController.getDisputeDetails,
);

adminDisputeRouter.post(
  "/:id/resolve",
  auth(ADMIN_ROLES),
  validateRequest(AdminDisputeValidations.resolveDisputeValidation),
  AdminDisputeController.resolveDispute,
);

adminDisputeRouter.post(
  "/:id/escalate",
  auth(ADMIN_ROLES),
  validateRequest(AdminDisputeValidations.escalateDisputeValidation),
  AdminDisputeController.escalateDispute,
);

export default adminDisputeRouter;
