import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import { uploadPairImage } from "../../middleware/multerMiddleware";
import LockerController from "./Locker.controller";

const LockerRouter = express.Router();

// Buyer: Add sneaker to personal locker collection (multi-photo Cloudinary/S3 upload)
LockerRouter.post(
  "/add-item",
  auth(["Buyer"]),
  uploadPairImage.array("images", 10),
  LockerController.addSneakerToLocker
);

// Buyer: Fetch authenticated user's personal sneaker locker
LockerRouter.get(
  "/my-locker",
  auth(["Buyer"]),
  LockerController.getMyLocker
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

// Buyer: Toggle locker item visibility between Public and Private
LockerRouter.patch(
  "/:id/toggle-privacy",
  auth(["Buyer"]),
  LockerController.toggleLockerPrivacy
);

// Buyer: Remove sneaker from locker
LockerRouter.delete(
  "/:id",
  auth(["Buyer"]),
  LockerController.deleteLockerItem
);

export default LockerRouter;

