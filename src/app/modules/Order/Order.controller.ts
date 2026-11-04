import { AuthRequest } from '../../../interface/authRequest';
import catchAsync from '../../../utilities/catchasync';
import sendResponse from '../../../utilities/sendResponse';
import OrderServices from './Order.service';

/**
 * Get Retailer Orders for 4 stages: Needs Action, Holds, Ready, History
 * Includes live today's orders count and average prep time
 */
const getRetailerOrdersByStageController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getRetailerOrdersByStage(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Retrieved retailer orders for ${result.activeTab} stage successfully.`,
    data: result,
  });
});

const getRetailerHomePageOrderStatDataController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getRetailerHomePageOrderStatDataService(user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Retrieved retailer order stat data.',
    data: result,
  });
});

const getOrderDetailController = catchAsync(async (req, res) => {
  const result = await OrderServices.getOrderDetailsById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Retrieved order detail.',
    data: result,
  });
});

const retailerAcceptOrder = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.retailerAcceptOrderService(user, req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Order accepted successfully.',
    data: result,
  });
});

const retailerMarkReadyController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.retailerMarkReadyService(user, req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Order marked ready for pickup/delivery.',
    data: result,
  });
});

const retailerCompleteOrderController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.retailerCompleteOrderService(user, req.params.id);

  sendResponse(res, {
    statusCode: 200,
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
    statusCode: 200,
    success: true,
    message: 'Order cancelled successfully and stock returned.',
    data: result,
  });
});

const getMyOrders = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OrderServices.getMyOrdersService(user.profileId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved buyer's orders successfully.",
    data: result.data,
    meta: result.meta,
  });
});

const OrderController = {
  getRetailerOrdersByStageController,
  getRetailerHomePageOrderStatDataController,
  getOrderDetailController,
  retailerAcceptOrder,
  retailerMarkReadyController,
  retailerCompleteOrderController,
  retailerCancelOrderController,
  getMyOrders,
};

export default OrderController;
