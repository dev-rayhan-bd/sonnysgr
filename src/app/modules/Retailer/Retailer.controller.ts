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
  const result: any = await RetailerServices.getRetailerInventory(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retailer inventory retrieved successfully.",
    meta: result.meta,
    data: result.products,
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
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const profileImage = files?.["profile-image"]?.[0];
  const coverImage = files?.["cover-image"]?.[0];
  const licence = files?.["licence"]?.[0];

  const result = await RetailerServices.updateRetailerProfileService(
    user,
    profileImage,
    coverImage,
    licence,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retailer profile updated.",
    data: result,
  });
});

const addVerificationInfo = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const license = files?.["retailer-file"]?.[0];
  const coverImage = files?.["cover-image"]?.[0];

  const result = await RetailerServices.addRetailerLicense(
    user,
    license,
    coverImage,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Added verification info.",
    data: result,
  });
});

const completeRetailerProfileController = catchAsync(async (req, res) => {
  const user = (req as AuthRequest).user;
  const { email } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const result = await RetailerServices.completeRetailerProfileService(
    user,
    email,
    files,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retailer profile completed successfully.",
    data: result,
  });
});

// --- Financials, Earnings & Payouts ---

const getFinancialOverviewController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await RetailerServices.getFinancialOverview(user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retailer financial overview retrieved successfully.",
    data: result,
  });
});

const getPayoutSettingsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await RetailerServices.getPayoutSettings(user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payout settings retrieved successfully.",
    data: result,
  });
});

const updatePayoutSettingsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await RetailerServices.updatePayoutSettings(user, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payout settings updated successfully.",
    data: result,
  });
});

const requestPayoutController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await RetailerServices.requestPayout(user, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Payout request submitted successfully.",
    data: result,
  });
});

const getPayoutHistoryController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await RetailerServices.getPayoutHistory(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payout history retrieved successfully.",
    data: result.data,
    meta: result.meta,
  });
});

const adminProcessPayoutController = catchAsync(async (req, res) => {
  const result = await RetailerServices.adminProcessPayout(req.params.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Payout marked as ${result.status} successfully.`,
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
  completeRetailerProfileController,
  getFinancialOverviewController,
  getPayoutSettingsController,
  updatePayoutSettingsController,
  requestPayoutController,
  getPayoutHistoryController,
  adminProcessPayoutController,
};

export default RetailerController;
