import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import AnalyticsValidations from "./Analytics.validation";
import AnalyticsController from "./Analytics.controller";

const AnalyticsRouter = express.Router();

// Store analytics dashboard (Module 18): sales, views, order funnel, top viewed products
AnalyticsRouter.get(
  "/store/overview",
  auth(["Retailer"]),
  validateRequest(AnalyticsValidations.storeOverviewValidationSchema),
  AnalyticsController.getStoreOverview
);

// Paginated product performance: views, units sold, revenue, inventory turnover
AnalyticsRouter.get(
  "/store/top-products",
  auth(["Retailer"]),
  validateRequest(AnalyticsValidations.topProductsValidationSchema),
  AnalyticsController.getTopProducts
);

export default AnalyticsRouter;
