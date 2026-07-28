import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import BuyerServices from "./Buyer.service";

const setBuyerNotificationAlertsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.setBuyerNotificationAlerts(user, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Notification alerts set successfully",
        data: result,
    });
});

const addSelectedShoeSizeController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.addSelectedShoeSize(user, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Selected shoe sizes added successfully",
        data: result,
    });
});

const addBrandsOfInterestController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.addBrandsOfInterest(user, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Brands of interest added successfully",
        data: result,
    });
});

const getBuyersInterestsDataController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.getBuyersInterestsData(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Buyer interests data retrieved successfully",
        data: result,
    });
});

const updateBuyerProfileController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.updateBuyerProfileService(user,req.file, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Buyer profile updated successfully",
        data: result,
    });
});


//buyer home page

const getNearbyProductsForBuyerController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.getNearbyProductsForBuyer(user,req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved buyer nearby product.",
        data: result,
    });
});

const getBuyerFollowedBrandsProductsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.getBuyerFollowedBrandsProducts(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved buyer followed brand product.",
        data: result,
    });
});

const getBuyerFollowedRetailersProductsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.getBuyerFollowedRetailersProducts(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved buyer followed retailer product.",
        data: result,
    });
});

const getBuyerFollowedBrandStoreWishlistData = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await BuyerServices.getBuyersStoreBrandWishlistdataService(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved buyer followed retailer, brands, wishlist data.",
        data: result,
    });
});

const completeBuyerProfileController = catchAsync(async (req, res) => {
    const user = (req as AuthRequest).user;
    const { email } = req.body;

    const result = await BuyerServices.completeBuyerProfileService(user, email, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Buyer profile completed successfully.",
        data: result,
    });
});

const BuyerController = { 
    setBuyerNotificationAlertsController,
    addSelectedShoeSizeController,
    addBrandsOfInterestController,
    getBuyersInterestsDataController,
    updateBuyerProfileController,
    completeBuyerProfileController,

    getNearbyProductsForBuyerController,
    getBuyerFollowedBrandsProductsController,
    getBuyerFollowedRetailersProductsController,
    getBuyerFollowedBrandStoreWishlistData
}


export default BuyerController;