import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import OrderController from "./Order.controller";

const OrderRouter = express.Router();

// --- 1. Retailer 4-Stage Order Management Feed & Fulfillment ---
OrderRouter.get(
  "/retailer-orders",
  auth(["Retailer"]),
  OrderController.getRetailerOrdersByStageController
);

OrderRouter.get(
  "/retailer-order-stat",
  auth(["Retailer"]),
  OrderController.getRetailerHomePageOrderStatDataController
);

OrderRouter.get(
  "/get-order-detail/:id",
  authorizeUser,
  OrderController.getOrderDetailController
);

OrderRouter.post(
  "/retailer-accept-order/:id",
  auth(["Retailer"]),
  OrderController.retailerAcceptOrder
);

OrderRouter.patch(
  "/retailer-mark-ready/:id",
  auth(["Retailer"]),
  OrderController.retailerMarkReadyController
);

OrderRouter.patch(
  "/retailer-complete-order/:id",
  auth(["Retailer"]),
  OrderController.retailerCompleteOrderController
);

OrderRouter.patch(
  "/retailer-cancel-order/:id",
  auth(["Retailer"]),
  OrderController.retailerCancelOrderController
);

// Retailer In-Store Verification & Settlement of Hold Reservations
OrderRouter.post(
  "/settle-hold",
  auth(["Retailer"]),
  OrderController.settleInStoreHoldOrderController
);

// --- 2. Buyer Order, Holds & Checkout Lifecycle Endpoints ---
OrderRouter.post(
  "/create-buy-now",
  auth(["Buyer"]),
  OrderController.createBuyNowOrderController
);

OrderRouter.post(
  "/create-hold-deposit",
  auth(["Buyer"]),
  OrderController.createHoldDepositOrderController
);

OrderRouter.get(
  "/my-holds",
  auth(["Buyer"]),
  OrderController.getMyActiveHoldsController
);

OrderRouter.get(
  "/my-orders",
  auth(["Buyer"]),
  OrderController.getMyOrders
);

OrderRouter.get(
  "/details/:orderId",
  auth(["Buyer", "Retailer"]),
  OrderController.getBuyerOrderDetailsController
);

OrderRouter.post(
  "/cancel/:orderId",
  auth(["Buyer"]),
  OrderController.cancelBuyerOrderController
);

export default OrderRouter;
