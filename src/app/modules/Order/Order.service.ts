import OrderFacadeService from './OrderFacadeService';

/**
 * Order Services Entry Point
 * Proxies calls through OrderFacadeService for clean architectural decoupling
 */
const getRetailerHomePageOrderStatDataService = async (user: any) => {
  return await OrderFacadeService.getRetailerOrdersByStage(user, { stage: 'Needs Action' });
};
const getOrderDetailsById = OrderFacadeService.getOrderDetailsById;
const retailerAcceptOrderService = OrderFacadeService.retailerAcceptOrder;
const retailerMarkReadyService = OrderFacadeService.retailerMarkReady;
const retailerCompleteOrderService = OrderFacadeService.retailerCompleteOrder;
const retailerCancelOrderService = OrderFacadeService.retailerCancelOrder;
const getMyActiveHoldsService = OrderFacadeService.getMyActiveHolds;
const settleInStoreHoldOrderService = OrderFacadeService.settleInStoreHoldOrder;
const verifyPickupService = OrderFacadeService.verifyPickup;
const releaseExpiredHoldsService = OrderFacadeService.releaseExpiredHolds;
const getMyOrdersService = OrderFacadeService.getMyOrders;
const getBuyerOrderDetailsService = OrderFacadeService.getBuyerOrderDetails;
const cancelBuyerOrderService = OrderFacadeService.cancelBuyerOrder;
const getRetailerOrdersByStage = OrderFacadeService.getRetailerOrdersByStage;

const OrderServices = {
  getRetailerHomePageOrderStatDataService,
  getOrderDetailsById,
  retailerAcceptOrderService,
  retailerMarkReadyService,
  retailerCompleteOrderService,
  retailerCancelOrderService,
  getMyActiveHoldsService,
  settleInStoreHoldOrderService,
  verifyPickupService,
  releaseExpiredHoldsService,
  getMyOrdersService,
  getBuyerOrderDetailsService,
  cancelBuyerOrderService,
  getRetailerOrdersByStage,
};

export default OrderServices;
export { OrderFacadeService };
