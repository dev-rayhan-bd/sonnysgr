import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import { uploadPairImage } from "../../middleware/multerMiddleware";
import validateRequest from "../../middleware/validateRequest";
import LockerController from "./Locker.controller";
import LockerValidations from "./Locker.validation";

const LockerRouter = express.Router();

const allRoles = ["Buyer", "Retailer", "Reseller", "Super Admin"];

// Buyer: Add sneaker to personal locker collection (multi-photo Cloudinary/S3 upload)
LockerRouter.post(
  "/add-item",
  auth(["Buyer"]),
  uploadPairImage.array("images", 10),
  LockerController.addSneakerToLocker
);

// Buyer: Fetch authenticated user's personal sneaker locker with stats
LockerRouter.get(
  "/my-locker",
  auth(["Buyer"]),
  LockerController.getMyLocker
);

// Buyer: Toggle entire locker collection privacy (Public vs Private)
LockerRouter.patch(
  "/toggle-collection-privacy",
  auth(["Buyer"]),
  validateRequest(LockerValidations.toggleCollectionPrivacyValidation),
  LockerController.toggleLockerCollectionPrivacy
);

// Community Lockers Feed: Browse public collector collections
LockerRouter.get(
  "/community",
  auth(allRoles),
  validateRequest(LockerValidations.communityQueryValidation),
  LockerController.getCommunityLockers
);

// View a specific collector's public locker & collection stats
LockerRouter.get(
  "/collector/:buyerId",
  auth(allRoles),
  validateRequest(LockerValidations.collectorParamValidation),
  LockerController.getCollectorPublicLocker
);

// Buyer: Follow / Unfollow a community sneakerhead collector
LockerRouter.post(
  "/follow-collector/:buyerId",
  auth(["Buyer"]),
  validateRequest(LockerValidations.collectorParamValidation),
  LockerController.toggleFollowCollector
);

// Buyer: List all followed collectors with their latest grails
LockerRouter.get(
  "/followed-collectors",
  auth(["Buyer"]),
  LockerController.getFollowedCollectors
);

// Retailer & Community: Discover nearby customer lockers available for trade-in / buyback
LockerRouter.get(
  "/nearby-community",
  authorizeUser,
  LockerController.getNearbyCommunityLockers
);

// Fetch single locker sneaker details
LockerRouter.get(
  "/:id",
  authorizeUser,
  LockerController.getSingleLockerItem
);

// Buyer: Update sneaker details / upload additional condition photos
LockerRouter.patch(
  "/:id",
  auth(["Buyer"]),
  uploadPairImage.array("images", 10),
  LockerController.updateLockerItem
);

// Buyer: Toggle single locker item visibility between Public and Private
LockerRouter.patch(
  "/:id/toggle-privacy",
  auth(["Buyer"]),
  validateRequest(LockerValidations.toggleItemPrivacyValidation),
  LockerController.toggleLockerPrivacy
);

// Buyer: Remove sneaker from locker
LockerRouter.delete(
  "/:id",
  auth(["Buyer"]),
  LockerController.deleteLockerItem
);

export default LockerRouter;
