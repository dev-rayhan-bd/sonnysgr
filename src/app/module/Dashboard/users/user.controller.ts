import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import usersDashboardServices from "./users.service";

const getAllUsers = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.getAllUsersService(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "All users retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getSingleUser = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.getSingleUserService(req.params.id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User details retrieved successfully.",
        data: result,
    });
});

const updateUserStatus = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.updateUserStatusService(req.params.id, req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User status updated successfully.",
        data: result,
    });
});

const approveRetailerStore = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.approveRetailerStoreService(req.params.id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer store approved successfully.",
        data: result,
    });
});

const suspendStore = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.suspendReactivateStoreService(req.params.id, "Suspend");
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer store suspended successfully.",
        data: result,
    });
});

const reactivateStore = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.suspendReactivateStoreService(req.params.id, "Reactivate");
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer store reactivated successfully.",
        data: result,
    });
});

const getRetailerDocuments = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.getRetailerDocumentsService(req.params.id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer license documents retrieved successfully.",
        data: result,
    });
});

const getRetailerAnalytics = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.getRetailerAnalyticsService(req.params.id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retailer store analytics retrieved successfully.",
        data: result,
    });
});

const verifyReseller = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.verifyResellerService(req.params.id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Reseller verified successfully.",
        data: result,
    });
});

const getResellerInventory = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.getResellerInventoryService(req.params.id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Reseller inventory retrieved successfully.",
        data: result,
    });
});

const adjustResellerTrustScore = catchAsync(async (req, res) => {
    const result = await usersDashboardServices.adjustResellerTrustScoreService(req.params.id, req.body.trustScore);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Reseller trust score adjusted successfully.",
        data: result,
    });
});

const userManagementController = {
    getAllUsers,
    getSingleUser,
    updateUserStatus,
    approveRetailerStore,
    suspendStore,
    reactivateStore,
    getRetailerDocuments,
    getRetailerAnalytics,
    verifyReseller,
    getResellerInventory,
    adjustResellerTrustScore,
};

export default userManagementController;
