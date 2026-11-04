import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import RetailerValidations from "./Retailer.validation";
import RetailerController from "./Retailer.controller";
import { uploadRetailerFields } from "../../middleware/multerMiddleware";
import DemandRouter from "../Demand/Demand.routes";

const RetailerRouter = express.Router();

RetailerRouter.get(
  "/get-nearby-retailers",
  validateRequest(RetailerValidations.validateLatLongTofilterNearbyRetailers),
  RetailerController.filterNearbyRetailersController
);

// buyer map page
RetailerRouter.get(
  "/get-nearby-retailer-map",
  validateRequest(RetailerValidations.validateLatLongTofilterNearbyRetailers),
  RetailerController.getAllNearbyRetailerForMap
);

// retailer inventory
RetailerRouter.get(
  "/get-retailer-inventory",
  auth(["Retailer"]),
  validateRequest(RetailerValidations.getRetailerInventoryValidationSchema),
  RetailerController.getRetailerInventoryController
);

// retailer order
RetailerRouter.get(
  "/get-retailer-order",
  auth(["Retailer"]),
  RetailerController.getRetailerAllOrdersController
);

RetailerRouter.post(
  "/toggle-retailer-operation-hour",
  auth(["Retailer"]),
  RetailerController.toggleRetailerOperationHourController
);

RetailerRouter.patch(
  "/update-retailer-profile",
  auth(["Retailer"]),
  uploadRetailerFields.fields([
    { name: "profile-image", maxCount: 1 },
    { name: "cover-image", maxCount: 1 },
    { name: "licence", maxCount: 1 },
  ]),
  RetailerController.updateRetailerProfile
);

RetailerRouter.post(
  "/add-verification-info",
  auth(["Retailer"]),
  uploadRetailerFields.fields([
    { name: "retailer-file", maxCount: 1 },
    { name: "cover-image", maxCount: 1 },
  ]),
  validateRequest(RetailerValidations.addVerificationInfoValidationSchema),
  RetailerController.addVerificationInfo
);

// profile completion
RetailerRouter.patch(
  "/complete-retailer-profile",
  auth(["Retailer"], false),
  uploadRetailerFields.fields([
    { name: "profile-image", maxCount: 1 },
    { name: "cover-image", maxCount: 1 },
    { name: "licence", maxCount: 1 },
  ]),
  validateRequest(RetailerValidations.completeRetailerProfileValidation),
  RetailerController.completeRetailerProfileController
);

// --- Financials, Earnings Dashboard & Payout Engine ---

RetailerRouter.get(
  "/financial-overview",
  auth(["Retailer"]),
  RetailerController.getFinancialOverviewController
);

RetailerRouter.get(
  "/payout-settings",
  auth(["Retailer"]),
  RetailerController.getPayoutSettingsController
);

RetailerRouter.put(
  "/payout-settings",
  auth(["Retailer"]),
  RetailerController.updatePayoutSettingsController
);

RetailerRouter.post(
  "/request-payout",
  auth(["Retailer"]),
  RetailerController.requestPayoutController
);

RetailerRouter.get(
  "/payout-history",
  auth(["Retailer"]),
  RetailerController.getPayoutHistoryController
);

RetailerRouter.patch(
  "/admin-process-payout/:id",
  auth(["Admin", "SuperAdmin"]),
  RetailerController.adminProcessPayoutController
);

RetailerRouter.use("/demand", DemandRouter);

export default RetailerRouter;
