import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import { ADMIN_ROLES } from "../dashboard.shared";
import AdminModerationController from "./adminModeration.controller";
import AdminModerationValidations from "./adminModeration.validation";

const adminModerationRouter = express.Router();
const v = AdminModerationValidations;

// Reports (abuse / counterfeit / service) & fraud alerts
adminModerationRouter.get("/reports", auth(ADMIN_ROLES), validateRequest(v.reportsListValidation), AdminModerationController.getReports);
adminModerationRouter.get("/fraud-alerts", auth(ADMIN_ROLES), validateRequest(v.reportsListValidation), AdminModerationController.getFraudAlerts);
adminModerationRouter.get("/reports/:id", auth(ADMIN_ROLES), validateRequest(v.idValidation), AdminModerationController.getReportDetails);
adminModerationRouter.patch("/reports/:id/resolve", auth(ADMIN_ROLES), validateRequest(v.resolveReportValidation), AdminModerationController.resolveReport);

// Review moderation
adminModerationRouter.get("/reviews", auth(ADMIN_ROLES), validateRequest(v.reviewsListValidation), AdminModerationController.getReviews);
adminModerationRouter.delete("/reviews/:id", auth(ADMIN_ROLES), validateRequest(v.idValidation), AdminModerationController.deleteReview);

// Drop approval
adminModerationRouter.get("/drops", auth(ADMIN_ROLES), validateRequest(v.dropsListValidation), AdminModerationController.getDrops);
adminModerationRouter.patch("/drops/:id/review", auth(ADMIN_ROLES), validateRequest(v.reviewDropValidation), AdminModerationController.reviewDrop);

export default adminModerationRouter;
