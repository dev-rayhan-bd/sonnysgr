import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import ResellerValidations from "./Reseller.validation";
import ResellerController from "./Reseller.controller";
import { uploadProfile } from "../../middleware/multerMiddleware";

const ResellerRouter = express.Router();

// Dashboard homepage analytics summary
ResellerRouter.get(
  "/reseller-homepage-stat-data",
  auth(["Reseller"]),
  ResellerController.resellerHomePageStatDataController
);

// High-level profile stat summary
ResellerRouter.get(
  "/reseller-profile-stat-data",
  auth(["Reseller"]),
  ResellerController.resellerProfileStatData
);

// Reseller's own full profile
ResellerRouter.get(
  "/get-reseller-profile",
  auth(["Reseller"]),
  ResellerController.getResellerProfile
);

// Public profile lookup (respects visibility controls)
ResellerRouter.get(
  "/public-profile/:id",
  auth(["Buyer", "Retailer", "Reseller", "Super Admin"]),
  ResellerController.getPublicResellerProfileController
);

// Update profile details with multi-cloud profile/cover upload (500MB)
ResellerRouter.patch(
  "/update-reseller-profile",
  auth(["Reseller"]),
  uploadProfile.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "profile-image", maxCount: 1 },
  ]),
  validateRequest(ResellerValidations.updateResellerProfileValidationSchema),
  ResellerController.updateResellerProfile
);

// Update granular privacy & visibility toggles (Module 1.10)
ResellerRouter.patch(
  "/update-visibility-controls",
  auth(["Reseller"]),
  validateRequest(ResellerValidations.updateVisibilityControlsValidationSchema),
  ResellerController.updateVisibilityControlsController
);

// Make an offer / request for reseller's pair listing
ResellerRouter.post(
  "/make-pair-request",
  auth(["Retailer", "Reseller"]),
  validateRequest(ResellerValidations.makeRequestForPairValidationSchema),
  ResellerController.proposeAnOfferToResellerForPairRequestController
);

export default ResellerRouter;
