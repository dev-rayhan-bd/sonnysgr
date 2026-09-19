import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import EngagementServices from "./Engagement.service";


//follow retailer

const followRetailerController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.followRetailerService(user, req.params.id);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Retailer followed successfully.",
        data: result,
    });
});

const unfollowRetailerController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.unfollowRetailerService(user, req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer unfollowed successfully.",
        data: result,
    });
});

//follow user

const followUser = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.followUserService(user, req.params.id);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Followed successfully.",
        data: result,
    });
});

const getNearbyUser = catchAsync(async (req, res) => {

    // const { user } = req as AuthRequest;

    const result = await EngagementServices.getNearbyUser(req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved all nearby user.",
        data: result,
    });
});

const getAllFollowing = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.getAllFollowingUser(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved all following user.",
        data: result,
    });
});

const getAllFollower = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.getAllFollower(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved all followers.",
        data: result,
    });
});

const getFollowUserDetailsController = catchAsync(async (req, res) => {

    // const { user } = req as AuthRequest;

    const result = await EngagementServices.getFollowUserDetails( req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved user details.",
        data: result,
    });
});

//wishlist

const addToWishlistController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.addToWishlistService(user, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Product added to wishlist successfully.",
        data: result,
    });
});

const addToWantedlistController = catchAsync(async (req, res) => {

    // const { user } = req as AuthRequest;

    const result = await EngagementServices.addToWantedlistService(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Product marked as wanted successfully.",
        data: result,
    });
});

const removeFromWishlistController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.removeFromWishlistService(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Product removed from wishlist successfully.",
        data: result,
    });
});
const addReviewController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await EngagementServices.addReviewService(user, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Review added successfully.",
        data: result,
    });
});

const EngagementController = { 
    followRetailerController,
    unfollowRetailerController,

    followUser,
    getNearbyUser,
    getAllFollower,
    getAllFollowing,
    getFollowUserDetailsController,

    addToWishlistController,
    addToWantedlistController,
    removeFromWishlistController,
    addReviewController
};



export default EngagementController;