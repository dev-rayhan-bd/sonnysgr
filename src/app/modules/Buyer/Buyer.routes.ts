import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import BuyerValidations from "./Buyer.validation";
import BuyerController from "./Buyer.controller";
import { uploadProfile } from "../../middleware/multerMiddleware";

const BuyerRouter = express.Router();

// --- 1. Size-Match & Hyper-Local Discovery Engine (Core USP - Modules 2, 3, 4, 5) ---
BuyerRouter.get(
  "/size-match-feed",
  auth(["Buyer"]),
  BuyerController.getLiveSizeMatchFeedController
);

BuyerRouter.get(
  "/size-match-map",
  auth(["Buyer"]),
  BuyerController.getSizeMatchMapPinsController
);

// --- 2. Onboarding, Profile & Shoe Size Preferences ---
BuyerRouter.post(
  "/set-buyer-notification-alerts",
  auth(["Buyer"]),
  BuyerController.setBuyerNotificationAlertsController
);

BuyerRouter.post(
  "/set-buyer-shoe-size",
  auth(["Buyer"]),
  BuyerController.addSelectedShoeSizeController
);

BuyerRouter.post(
  "/add-buyer-interested-brands",
  auth(["Buyer"]),
  BuyerController.addBrandsOfInterestController
);

BuyerRouter.get(
  "/get-buyer-interests",
  auth(["Buyer"]),
  BuyerController.getBuyersInterestsDataController
);

BuyerRouter.patch(
  "/update-buyer-profile",
  auth(["Buyer"]),
  uploadProfile.single("profile-image"),
  BuyerController.updateBuyerProfileController
);

BuyerRouter.patch(
  "/complete-buyer-profile",
  auth(["Buyer"], false),
  validateRequest(BuyerValidations.completeBuyerProfileValidation),
  BuyerController.completeBuyerProfileController
);

// --- 3. Hyper-Local Products & Store Feeds ---
BuyerRouter.get(
  "/buyer-nearby-product",
  auth(["Buyer"]),
  validateRequest(BuyerValidations.getBuyerNearbyProductValidation),
  BuyerController.getNearbyProductsForBuyerController
);

BuyerRouter.get(
  "/buyer-followed-brand-product",
  auth(["Buyer"]),
  BuyerController.getBuyerFollowedBrandsProductsController
);

BuyerRouter.get(
  "/buyer-followed-retailer-product",
  auth(["Buyer"]),
  BuyerController.getBuyerFollowedRetailersProductsController
);

BuyerRouter.get(
  "/buyer-brand-retailer-wishlist",
  auth(["Buyer"]),
  BuyerController.getBuyerFollowedBrandStoreWishlistData
);

BuyerRouter.get(
  "/retailers",
  auth(["Buyer"]),
  BuyerController.getAllRetailersByBuyerController
);

BuyerRouter.get(
  "/retailers/:id",
  auth(["Buyer"]),
  BuyerController.getSingleRetailerByBuyerController
);

// --- 4. Purchase History & Physical Store Footprint (Module 1.8 & 1.9) ---
BuyerRouter.get(
  "/purchase-history",
  auth(["Buyer"]),
  BuyerController.getPurchaseHistoryController
);

BuyerRouter.post(
  "/store-visit/checkin",
  auth(["Buyer"]),
  BuyerController.recordQrCheckinController
);

BuyerRouter.get(
  "/store-visit/history",
  auth(["Buyer"]),
  BuyerController.getStoreVisitHistoryController
);

// --- 5. VIP Loyalty & Daily Login Rewards (Module 1.11 & 13) ---
BuyerRouter.get(
  "/loyalty/vip-status",
  auth(["Buyer"]),
  BuyerController.getVipStatusController
);

BuyerRouter.post(
  "/loyalty/claim-daily-login",
  auth(["Buyer"]),
  BuyerController.claimDailyLoginController
);

// --- 6. Viral Referral Credit Rewards Engine (Module 13.4) ---
BuyerRouter.get(
  "/referrals/my-code",
  auth(["Buyer"]),
  BuyerController.getMyReferralCodeController
);

BuyerRouter.post(
  "/referrals/apply-code",
  auth(["Buyer"]),
  validateRequest((BuyerValidations as any).applyReferralCodeValidation),
  BuyerController.applyReferralCodeController
);

BuyerRouter.get(
  "/referrals/earnings",
  auth(["Buyer"]),
  BuyerController.getReferralEarningsController
);

// --- 7. Sub-Routers ---
import WishlistRouter from "./wishlist/wishlist.routes";
import FollowingRouter from "./following/following.routes";
import AlertPreferencesRouter from "./alertSettings/alertSettings.routes";
import ReportToStoreRouter from "./reportToStore/reportToStore.routes";

BuyerRouter.use("/wishlist", WishlistRouter);
BuyerRouter.use("/following", FollowingRouter);
BuyerRouter.use("/alert-preferences", AlertPreferencesRouter);
BuyerRouter.use("/report-to-store", ReportToStoreRouter);

export default BuyerRouter;
