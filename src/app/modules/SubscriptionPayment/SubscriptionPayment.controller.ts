import { StatusCodes } from "http-status-codes";
import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import SubscriptionPaymentServices from "./SubscriptionPayment.service";

// --- Plan catalog (Admin manages, Retailer browses) ---

const createPlan = catchAsync(async (req, res) => {
  const result = await SubscriptionPaymentServices.createPlan(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Plan created successfully.",
    data: result,
  });
});

const updatePlan = catchAsync(async (req, res) => {
  const result = await SubscriptionPaymentServices.updatePlan(req.params.id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Plan updated successfully.",
    data: result,
  });
});

const deactivatePlan = catchAsync(async (req, res) => {
  const result = await SubscriptionPaymentServices.deactivatePlan(req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Plan deactivated successfully.",
    data: result,
  });
});

const getPlans = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await SubscriptionPaymentServices.getPlans(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Plans retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getPlanById = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await SubscriptionPaymentServices.getPlanById(user, req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Plan retrieved successfully.",
    data: result,
  });
});

// --- Retailer purchase flow ---

const createCheckout = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await SubscriptionPaymentServices.createCheckout(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Checkout session created. Complete payment via the link.",
    data: result,
  });
});

const getMyPlanStatus = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await SubscriptionPaymentServices.getMyPlanStatus(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Plan status retrieved successfully.",
    data: result,
  });
});

const getPurchaseHistory = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await SubscriptionPaymentServices.getPurchaseHistory(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Plan purchase history retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

export const SubscriptionPaymentController = {
  createPlan,
  updatePlan,
  deactivatePlan,
  getPlans,
  getPlanById,
  createCheckout,
  getMyPlanStatus,
  getPurchaseHistory,
};

export default SubscriptionPaymentController;
