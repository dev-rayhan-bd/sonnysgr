import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import OrderController from "./Order.controller";

const OrderRouter = express.Router();

// Retailer 4-Stage Order Management Feed (Needs Action, Holds, Ready, History)
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

// Retailer Fulfillment Action Routes
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

// Buyer Order Route
OrderRouter.get(
  "/my-orders",
  auth(["Buyer"]),
  OrderController.getMyOrders
);

export default OrderRouter;
