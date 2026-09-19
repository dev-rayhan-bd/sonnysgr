import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import EngagementValidations from "./Engagement.validation";
import EngagementController from "./Engagement.controller";


const EngagementRouter = express.Router();

//follow retailer

EngagementRouter.post(
    "/follow-retailer/:id",
    authorizeUser,
    // validateRequest(EngagementValidations.followRetailerZodSchema),
    EngagementController.followRetailerController   
);

EngagementRouter.post( 
    "/unfollow-retailer/:id",
    authorizeUser,
    // validateRequest(EngagementValidations.followRetailerZodSchema),
    EngagementController.unfollowRetailerController   
);

//follow user

EngagementRouter.post(
    "/follow-user/:id",
    authorizeUser,
    // validateRequest(EngagementValidations.addToWishListValidation),
    EngagementController.followUser   
);

EngagementRouter.get(
    "/get-nearby-user",
    // authorizeUser,
    validateRequest(EngagementValidations.validateLatLongTofilterNearbyUsers),
    EngagementController.getNearbyUser   
);

EngagementRouter.get(
    "/get-all-follower",
    authorizeUser,
    // validateRequest(EngagementValidations.addToWishListValidation),
    EngagementController.getAllFollower   
);

EngagementRouter.get(
    "/get-all-following",
    authorizeUser,
    // validateRequest(EngagementValidations.addToWishListValidation),
    EngagementController.getAllFollowing   
);

EngagementRouter.post(
    "/get-follow-user-details/:id",
    // authorizeUser,
    // validateRequest(EngagementValidations.addToWishListValidation),
    EngagementController.getFollowUserDetailsController   
);

//wishlist

EngagementRouter.post(
    "/add-to-wishlist",
    authorizeUser,
    validateRequest(EngagementValidations.addToWishListValidation),
    EngagementController.addToWishlistController   
);

EngagementRouter.post(
    "/add-to-wantedlist/:id",
    authorizeUser,
    // validateRequest(EngagementValidations.followRetailerZodSchema),
    EngagementController.addToWantedlistController   
);
EngagementRouter.post(
    "/remove-from-wishlist/:id",
    authorizeUser,
    // validateRequest(EngagementValidations.followRetailerZodSchema),
    EngagementController.removeFromWishlistController   
);

EngagementRouter.post(
    "/add-review",
    authorizeUser,
    // validateRequest(EngagementValidations.followRetailerZodSchema),
    EngagementController.addReviewController   
);

export default EngagementRouter;