import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import { ADMIN_ROLES } from "../dashboard.shared";
import AdminAnalyticsController from "./adminAnalytics.controller";
import AdminAnalyticsValidations from "./adminAnalytics.validation";

const adminAnalyticsRouter = express.Router();
const v = AdminAnalyticsValidations;

adminAnalyticsRouter.get("/gmv", auth(ADMIN_ROLES), validateRequest(v.gmvQueryValidation), AdminAnalyticsController.getGmv);
adminAnalyticsRouter.get("/commission", auth(ADMIN_ROLES), validateRequest(v.commissionQueryValidation), AdminAnalyticsController.getCommission);
adminAnalyticsRouter.get("/cities", auth(ADMIN_ROLES), validateRequest(v.rankingQueryValidation), AdminAnalyticsController.getTopCities);
adminAnalyticsRouter.get("/top-brands", auth(ADMIN_ROLES), validateRequest(v.rankingQueryValidation), AdminAnalyticsController.getTopBrands);
adminAnalyticsRouter.get("/top-stores", auth(ADMIN_ROLES), validateRequest(v.rankingQueryValidation), AdminAnalyticsController.getTopStores);
adminAnalyticsRouter.get("/top-resellers", auth(ADMIN_ROLES), validateRequest(v.rankingQueryValidation), AdminAnalyticsController.getTopResellers);

export default adminAnalyticsRouter;
