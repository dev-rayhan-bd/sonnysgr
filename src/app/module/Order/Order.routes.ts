import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import OrderValidations from "./Order.validation";
import OrderController from "./Order.controller";


const OrderRouter = express.Router();

OrderRouter.get(
    "/retailer-order-stat",
    authorizeUser,
    OrderController.getRetailerHomePageOrderStatDataController
);

OrderRouter.get(
    "/get-order-detail/:id",
    // authorizeUser,
    OrderController.getOrderDetailController
);

OrderRouter.post(
    "/retailer-accept-order/:id",
    // authorizeUser,
    OrderController.getOrderDetailController
);


export default OrderRouter;

/*
    #Direct buy or hold item

    1. buyer select a item
    2. click
    3. create order and orderItem collection
    4. make payment and create payment schema collection
    5. Webhook confirm payment
    5. Adjust inventory


    #Cart item handling
    1.multiple item available
    2. calculate total price
    3. apply promo code to total price
    4.final price and click
    5.create a order and multiple orderItem 
    6. Make payment and create payment schema collection
    7.webhook comfirm payment
    8. adjust inventory


*/