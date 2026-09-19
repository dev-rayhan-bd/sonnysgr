import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import SourcingServices from "./Sourcing.service";

const toggleTrustResellerController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { resellerId } = req.body;

  const result = await SourcingServices.toggleTrustReseller(
    user.profileId,
    resellerId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

const getAllActiveResellersController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await SourcingServices.getAllActiveResellers(user.profileId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Active resellers fetched successfully.",
    data: result,
  });
});

const getTrustedResellersController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await SourcingServices.getTrustedResellers(user.profileId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Trusted resellers with profile and inventory fetched successfully.",
    data: result,
  });
});

const getResellerProductsController = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await SourcingServices.getResellerProducts(id, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reseller products fetched successfully.",
    meta: result.meta,
    data: result.products,
  });
});

const SourcingController = {
  toggleTrustResellerController,
  getAllActiveResellersController,
  getTrustedResellersController,
  getResellerProductsController,
};

export default SourcingController;
