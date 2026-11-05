import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import BuyerServices from "./Buyer.service";
import { StatusCodes } from "http-status-codes";

// --- Size-Match & Hyper-Local Discovery Engine (Core USP) ---

const getLiveSizeMatchFeedController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getLiveSizeMatchFeed(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Live size-match sneakers feed retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSizeMatchMapPinsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getSizeMatchMapPins(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Size-matched nearby store map pins retrieved successfully",
    data: result,
  });
});

// --- Profile & Preferences ---

const setBuyerNotificationAlertsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.setBuyerNotificationAlerts(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notification alerts set successfully",
    data: result,
  });
});

const addSelectedShoeSizeController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.addSelectedShoeSize(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Selected shoe sizes added successfully",
    data: result,
  });
});

const addBrandsOfInterestController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.addBrandsOfInterest(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Brands of interest added successfully",
    data: result,
  });
});

const getBuyersInterestsDataController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getBuyersInterestsData(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Buyer interests data retrieved successfully",
    data: result,
  });
});

const updateBuyerProfileController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.updateBuyerProfileService(user, req.file, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Buyer profile updated successfully",
    data: result,
  });
});

const completeBuyerProfileController = catchAsync(async (req, res) => {
  const user = (req as AuthRequest).user;
  const { email } = req.body;
  const result = await BuyerServices.completeBuyerProfileService(user, email, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Buyer profile completed successfully.",
    data: result,
  });
});

// --- Home Page & Engagement Feeds ---

const getNearbyProductsForBuyerController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getNearbyProductsForBuyer(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved buyer nearby products successfully",
    data: result,
  });
});

const getBuyerFollowedBrandsProductsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getBuyerFollowedBrandsProducts(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved buyer followed brand products successfully",
    data: result,
  });
});

const getBuyerFollowedRetailersProductsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getBuyerFollowedRetailersProducts(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved buyer followed retailer products successfully",
    data: result,
  });
});

const getBuyerFollowedBrandStoreWishlistData = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getBuyersStoreBrandWishlistdataService(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved buyer followed retailer, brands, wishlist data successfully",
    data: result,
  });
});

const getAllRetailersByBuyerController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BuyerServices.getAllRetailersByBuyer(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retailers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleRetailerByBuyerController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;
  const result = await BuyerServices.getSingleRetailerByBuyer(user, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retailer details retrieved successfully",
    data: result,
  });
});

const BuyerController = {
  getLiveSizeMatchFeedController,
  getSizeMatchMapPinsController,
  setBuyerNotificationAlertsController,
  addSelectedShoeSizeController,
  addBrandsOfInterestController,
  getBuyersInterestsDataController,
  updateBuyerProfileController,
  completeBuyerProfileController,
  getNearbyProductsForBuyerController,
  getBuyerFollowedBrandsProductsController,
  getBuyerFollowedRetailersProductsController,
  getBuyerFollowedBrandStoreWishlistData,
  getAllRetailersByBuyerController,
  getSingleRetailerByBuyerController,
};

export default BuyerController;
