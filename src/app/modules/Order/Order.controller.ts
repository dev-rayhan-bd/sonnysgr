import { AuthRequest } from '../../../interface/authRequest';
import catchAsync from '../../../utilities/catchasync';
import sendResponse from '../../../utilities/sendResponse';
import OrderServices from './Order.service';
import { StatusCodes } from 'http-status-codes';
import OrderPaymentFacadeService from '../OrderPayment/OrderPaymentFacadeService';

/**
 * Get Retailer Orders for 4 stages: Needs Action, Holds, Ready, History
 * Includes live today's orders count and average prep time
 */
const getRetailerOrdersByStageController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getRetailerOrdersByStage(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Retrieved retailer orders for ${result.activeTab} stage successfully.`,
    data: result,
  });
});

const getRetailerHomePageOrderStatDataController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getRetailerHomePageOrderStatDataService(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Retrieved retailer order stat data.',
    data: result,
  });
});

const getOrderDetailController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getOrderDetailsById(user, String(req.params.id));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Retrieved order detail.',
    data: result,
  });
});

const retailerAcceptOrder = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.retailerAcceptOrderService(user, req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order accepted successfully.',
    data: result,
  });
});

const retailerMarkReadyController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.retailerMarkReadyService(user, req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order marked ready for pickup/delivery.',
    data: result,
  });
});

const retailerCompleteOrderController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.retailerCompleteOrderService(user, req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order completed successfully.',
    data: result,
  });
});

const retailerCancelOrderController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.retailerCancelOrderService(
    user,
    req.params.id,
    req.body.reason
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order cancelled successfully and stock returned.',
    data: result,
  });
});

// --- Retailer In-Store Hold Settlement ---

const settleInStoreHoldOrderController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.settleInStoreHoldOrderService(user.profileId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'In-store hold verified, deposit deducted, and settled successfully.',
    data: result,
  });
});

const verifyPickupController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.verifyPickupService(user, req.body.pickupVerificationCode);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Pickup verified. Order released to the buyer.',
    data: result,
  });
});

// --- Buyer Order Controllers ---

const createBuyNowOrderController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  // Unpaid "Pending Payment" order + Stripe link; the webhook marks it paid
  const result = await OrderPaymentFacadeService.buyNow(user.profileId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Order created. Complete payment via the payment link.',
    data: result,
  });
});

const createHoldDepositOrderController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { partialDepositAmount, depositAmount, ...rest } = req.body;
  // The hold countdown starts only after the deposit is paid (Stripe webhook)
  const result = await OrderPaymentFacadeService.holdDeposit(user.profileId, {
    ...rest,
    depositAmount: depositAmount ?? partialDepositAmount,
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Hold created. Pay the deposit via the payment link to start the hold timer.',
    data: result,
  });
});

const getMyActiveHoldsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getMyActiveHoldsService(user.profileId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Active holds retrieved with countdown timers.',
    data: result,
  });
});

const getMyOrders = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getMyOrdersService(user.profileId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved buyer's orders successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getBuyerOrderDetailsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const orderId = req.params.orderId || req.params.id;
  const result = await OrderServices.getBuyerOrderDetailsService(user.profileId, orderId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order details retrieved with pickup verification code.',
    data: result,
  });
});

const cancelBuyerOrderController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const orderId = req.params.orderId || req.params.id;
  const result = await OrderServices.cancelBuyerOrderService(user.profileId, orderId, req.body.reason);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Order cancelled successfully and inventory released.',
    data: result,
  });
});

const OrderController = {
  verifyPickupController,
  getRetailerOrdersByStageController,
  getRetailerHomePageOrderStatDataController,
  getOrderDetailController,
  retailerAcceptOrder,
  retailerMarkReadyController,
  retailerCompleteOrderController,
  retailerCancelOrderController,
  settleInStoreHoldOrderController,
  createBuyNowOrderController,
  createHoldDepositOrderController,
  getMyActiveHoldsController,
  getMyOrders,
  getBuyerOrderDetailsController,
  cancelBuyerOrderController,
};

export default OrderController;
