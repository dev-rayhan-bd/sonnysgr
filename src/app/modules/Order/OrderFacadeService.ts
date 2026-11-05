import { IJwtPayload } from '../../../interface/jwt.interface';
import { RetailerOrderQuerySubService } from './subServices/RetailerOrderQuerySubService';
import { RetailerOrderFulfillmentSubService } from './subServices/RetailerOrderFulfillmentSubService';
import { OrderHoldSubService } from './subServices/OrderHoldSubService';
import { OrderCheckoutSubService } from './subServices/OrderCheckoutSubService';
import { BuyerOrderSubService } from './subServices/BuyerOrderSubService';

/**
 * Order Facade Service: High-Level Orchestrator
 * Coordinates checkout, 4-stage retailer orders, holds, and fulfillment
 */
export class OrderFacadeService {
  // --- Retailer 4-Stage Orders & Metrics ---
  static async getRetailerOrdersByStage(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    return await RetailerOrderQuerySubService.getRetailerOrdersByStage(userDetails, query);
  }

  static async getOrderDetailsById(orderItemId: string) {
    return await RetailerOrderQuerySubService.getOrderDetailsById(orderItemId);
  }

  // --- Retailer Fulfillment Actions ---
  static async retailerAcceptOrder(userDetails: IJwtPayload, orderItemId: string) {
    return await RetailerOrderFulfillmentSubService.acceptOrder(userDetails, orderItemId);
  }

  static async retailerMarkReady(userDetails: IJwtPayload, orderItemId: string) {
    return await RetailerOrderFulfillmentSubService.markReady(userDetails, orderItemId);
  }

  static async retailerCompleteOrder(userDetails: IJwtPayload, orderItemId: string) {
    return await RetailerOrderFulfillmentSubService.completeOrder(userDetails, orderItemId);
  }

  static async retailerCancelOrder(
    userDetails: IJwtPayload,
    orderItemId: string,
    reason?: string
  ) {
    return await RetailerOrderFulfillmentSubService.cancelOrder(userDetails, orderItemId, reason);
  }

  // --- Holds & Countdown Reservations (Module 9) ---
  static async holdOrder(userDetails: IJwtPayload, payload: any) {
    return await OrderHoldSubService.holdOrder(userDetails, payload);
  }

  static async getMyActiveHolds(buyerId: string) {
    return await OrderHoldSubService.getMyActiveHolds(buyerId);
  }

  static async settleInStoreHoldOrder(retailerId: string, payload: any) {
    return await OrderHoldSubService.settleInStoreHoldOrder(retailerId, payload);
  }

  static async releaseExpiredHolds() {
    return await OrderHoldSubService.releaseExpiredHolds();
  }

  // --- Checkout: Buy Now & Cart ---
  static async buyNowOrder(userDetails: IJwtPayload, payload: any) {
    return await OrderCheckoutSubService.buyNowOrder(userDetails, payload);
  }

  static async cartOrder(userDetails: IJwtPayload, payload: any) {
    return await OrderCheckoutSubService.cartOrder(userDetails, payload);
  }

  static async createDirectPendingOrderService(
    buyerId: string,
    orderItems: any[],
    shippingAddress: any,
    paymentMethod: string,
    session: any
  ) {
    return await OrderCheckoutSubService.createDirectPendingOrderService(
      buyerId,
      orderItems,
      shippingAddress,
      paymentMethod,
      session
    );
  }

  // --- Buyer Orders ---
  static async getMyOrders(buyerId: string, query: Record<string, unknown>) {
    return await BuyerOrderSubService.getMyOrders(buyerId, query);
  }

  static async getBuyerOrderDetails(buyerId: string, orderId: string) {
    return await BuyerOrderSubService.getBuyerOrderDetails(buyerId, orderId);
  }

  static async cancelBuyerOrder(buyerId: string, orderId: string, reason?: string) {
    return await BuyerOrderSubService.cancelBuyerOrder(buyerId, orderId, reason);
  }
}

export default OrderFacadeService;
