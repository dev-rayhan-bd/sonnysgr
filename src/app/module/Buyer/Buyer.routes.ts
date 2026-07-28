import express from "express";
import {auth} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import BuyerValidations from "./Buyer.validation";
import BuyerController from "./Buyer.controller";
import { uploadProfile } from "../../middlewares/multerMiddleware";


const BuyerRouter = express.Router();

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


//buyer home page

BuyerRouter.get(
    "/buyer-nearby-product",
    auth(["Buyer"]),
    validateRequest(BuyerValidations.getBuyerNearbyProductValidation),
    BuyerController.getBuyersInterestsDataController
);

BuyerRouter.get(
    "/buyer-followed-brand-product",
    auth(["Buyer"]),
    // validateRequest(BuyerValidations.getBuyerNearbyProductValidation),
    BuyerController.getBuyerFollowedBrandsProductsController
);

BuyerRouter.get(
    "/buyer-followed-retailer-product",
    auth(["Buyer"]),
    // validateRequest(BuyerValidations.getBuyerNearbyProductValidation),
    BuyerController.getBuyerFollowedRetailersProductsController
);

BuyerRouter.get(
    "/buyer-brand-retailer-wishlist",
    auth(["Buyer"]),
    // validateRequest(BuyerValidations.getBuyerNearbyProductValidation),
    BuyerController.getBuyerFollowedBrandStoreWishlistData
);

// Rabeyas code:

BuyerRouter.patch(
    "/complete-buyer-profile",
    auth(["Buyer"], false),
    validateRequest(BuyerValidations.completeBuyerProfileValidation),
    BuyerController.completeBuyerProfileController
);

export default BuyerRouter;