import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import RetailerServices from "./Retailer.service";

const filterNearbyRetailersController = catchAsync(async (req, res) => {

    const result = await RetailerServices.filterNearbyRetailers(req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Nearby retailers retrieved successfully.",
        data: result,
    });
});

const getAllNearbyRetailerForMap = catchAsync(async (req, res) => {

    const result = await RetailerServices.getAllNearbyRetailersForMap(req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Nearby retailers for map retrieved successfully.",
        data: result,
    });
});

const getRetailerInventoryController = catchAsync(async (req, res) => {
    const { user } = req as AuthRequest;

    const result = await RetailerServices.getRetailerInventory(user,req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer inventory retrieved successfully.",
        data: result,
    });
});

const getRetailerAllOrdersController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await RetailerServices.getAllOrdersOfRetailer(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "All orders of the retailer retrieved successfully.",
        data: result,
    });
});

const toggleRetailerOperationHourController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await RetailerServices.toggleOperationHour(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Operation hour toggled successfully.",
        data: result,
    });
});

const updateRetailerProfile = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    console.log("req.files:",req.files);

    const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
    };

    console.log("files:",files)

    const profileImage = files?.["profile-image"]?.[0];
    const coverImage = files?.["cover-image"]?.[0];

    const result = await RetailerServices.updateRetailerProfileService(user,profileImage,coverImage, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer profile updated.",
        data: result,
    });
});

const addVerificationInfo = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    console.log("req.files:",req.files);

    const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
    };

    console.log("files:",files)

    const license = files?.["retailer-file"]?.[0];
    const coverImage = files?.["cover-image"]?.[0];

    const result = await RetailerServices.addRetailerLicense(user,license,coverImage, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Added verification info.",
        data: result,
    });
});



//branch

const addNewBranchController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
    };

    const profileImage = files?.["profile-image"]?.[0];
    const coverImage = files?.["cover-image"]?.[0];

    const result = await RetailerServices.addNewBranch(user,profileImage,coverImage, req.query);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "New branch created successfully.",
        data: result,
    });
});

const getAllBranchController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await RetailerServices.getAllBranch(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved all branch.",
        data: result,
    });
});

const RetailerController = { 
    filterNearbyRetailersController,
    getAllNearbyRetailerForMap,

    getRetailerInventoryController,
    getRetailerAllOrdersController,

    toggleRetailerOperationHourController,
    updateRetailerProfile,
    addVerificationInfo,
    
    addNewBranchController,
    getAllBranchController,
};

export default RetailerController;