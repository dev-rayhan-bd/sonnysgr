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

const createSourcingRequestController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await SourcingServices.createSourcingRequest(
    user.profileId,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Sourcing request created successfully.",
    data: result,
  });
});

const getRetailerSourcingRequestsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { status } = req.query;

  const result = await SourcingServices.getRetailerSourcingRequests(
    user.profileId,
    status as string
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Outgoing sourcing requests fetched successfully.",
    data: result,
  });
});

const getResellerSourcingRequestsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { status } = req.query;

  const result = await SourcingServices.getResellerSourcingRequests(
    user.profileId,
    status as string
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Incoming sourcing requests fetched successfully.",
    data: result,
  });
});

const respondToSourcingRequestController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  const result = await SourcingServices.respondToSourcingRequest(
    user.profileId,
    id,
    status,
    rejectionReason
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Sourcing request ${status.toLowerCase()} successfully.`,
    data: result,
  });
});

const SourcingController = {
  toggleTrustResellerController,
  getAllActiveResellersController,
  getTrustedResellersController,
  createSourcingRequestController,
  getRetailerSourcingRequestsController,
  getResellerSourcingRequestsController,
  respondToSourcingRequestController,
};

export default SourcingController;
