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
const buyNowOrderService = OrderFacadeService.buyNowOrder;
const holdOrderService = OrderFacadeService.holdOrder;
const cartOrderService = OrderFacadeService.cartOrder;
const getMyOrdersService = OrderFacadeService.getMyOrders;
const getBuyerOrderDetailsService = OrderFacadeService.getBuyerOrderDetails;
const cancelBuyerOrderService = OrderFacadeService.cancelBuyerOrder;
const getRetailerOrdersByStage = OrderFacadeService.getRetailerOrdersByStage;
const createDirectPendingOrderService = OrderFacadeService.createDirectPendingOrderService;

const OrderServices = {
  getRetailerHomePageOrderStatDataService,
  getOrderDetailsById,
  retailerAcceptOrderService,
  retailerMarkReadyService,
  retailerCompleteOrderService,
  retailerCancelOrderService,
  buyNowOrderService,
  holdOrderService,
  cartOrderService,
  getMyOrdersService,
  getBuyerOrderDetailsService,
  cancelBuyerOrderService,
  getRetailerOrdersByStage,
  createDirectPendingOrderService,
};

export default OrderServices;
export { OrderFacadeService };
