import { stat } from "fs";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { IOrder, TOrderPayload } from "./Order.interface";
import {OrderItemModel, OrderModel, SellerSplitOrderModel} from "./Order.model";
import { ENUM_NOTIFICATION_TYPE, ENUM_ORDER_STATUS, ENUM_ORDER_TYPE } from "../../../utilities/enum";
import mongoose from "mongoose";
import {ProductModel} from "../Product/Product.model";
import { PaymentModel } from "../Payment/Payment.model";
import { completeOrderAfterPayment } from "../Payment/PaymentSuccess.service";
import notification from "../../../helper/notification";

const placeNewOrderService = async (userDetails:IJwtPayload,payload: TOrderPayload) => {

    const { profileId } = userDetails;

    const { retailerId, productId,orderType, selectedSize, quantity, unitPrice, pickupTime } = payload;

    //  3. create order and orderItem collection

    
    const newOrder = await OrderModel.create({
        buyerId: profileId,
        retailerId,
        status: orderType === ENUM_ORDER_TYPE.HOLD ? ENUM_ORDER_STATUS.HOLDING : ENUM_ORDER_STATUS.PLACED,
        type: orderType,
        productId,
        selectedSize,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        pickupTime
    });
    
    if(!newOrder){
        throw new ApiError(500, "Failed to place the order.");
    }

    // 4. make payment and create payment schema collection

    // 5. Webhook confirm payment
    
    // 5. Adjust inventory

    return null;

};

// buy-now.service.ts

interface BuyNowPayload {

    buyerId: string;

    productId: string;

    retailerId: string;

    selectedSize: number;

    quantity: number;

    paymentMethod:
        | "STRIPE"
        | "SSL_COMMERZ"
        | "BKASH"
        | "COD";

    shippingAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        area?: string;
    };
}

const buyNowService = async (
    payload: BuyNowPayload
) => {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        // =====================================================
        // 1. GET PRODUCT
        // =====================================================

        const product: any =
            await ProductModel.findById(
                payload.productId
            ).session(session);

        if (!product) {
            throw new Error("Product not found");
        }

        // =====================================================
        // 2. VALIDATE SIZE
        // =====================================================

        const sizeVariant = product.sizes.find(
            (s: any) =>
                s.size === payload.selectedSize
        );

        if (!sizeVariant) {
            throw new Error("Selected size unavailable");
        }

        // =====================================================
        // 3. VALIDATE STOCK
        // =====================================================

        if (
            sizeVariant.stock < payload.quantity
        ) {
            throw new Error("Insufficient stock");
        }

        // =====================================================
        // 4. CALCULATE PRICE
        // =====================================================

        const unitPrice = product.price;

        const subtotal = unitPrice * payload.quantity;

        const shippingCharge = 100;

        const discountAmount = 0;

        const totalAmount = subtotal + shippingCharge - discountAmount;

        // =====================================================
        // 5. CREATE ORDER
        // =====================================================

        const order = await OrderModel.create([{

            buyerId: payload.buyerId,

            orderNumber: `ORD-${Date.now()}`,

            subtotal,

            shippingCharge,

            discountAmount,

            totalAmount,

            totalItems: payload.quantity,

            paymentStatus: "PENDING",

            orderStatus: "PLACED",

            paymentMethod:
                payload.paymentMethod,

            shippingAddress:
                payload.shippingAddress,

        }], { session });

        const createdOrder = order[0];

        // =====================================================
        // 6. CREATE ORDER ITEM
        // =====================================================

        await OrderItemModel.create([{

            orderId: createdOrder._id,

            buyerId: payload.buyerId,

            retailerId: payload.retailerId,

            productId: payload.productId,

            productSnapshot: {
                name: product.name,
                image: product.image,
                brand: product.brand,
            },

            selectedSize:
                payload.selectedSize,

            quantity: payload.quantity,

            unitPrice,

            totalPrice: subtotal,

            status: "PLACED",

        }], { session });

        // =====================================================
        // 7. CREATE SELLER SPLIT ORDER
        // =====================================================

        await SellerSplitOrderModel.create([{

            orderId: createdOrder._id,

            retailerId: payload.retailerId,

            buyerId: payload.buyerId,

            totalItems: payload.quantity,

            totalAmount: subtotal,

            status: "PLACED",

        }], { session });

        // =====================================================
        // 8. CREATE PAYMENT
        // =====================================================

        const payment = await PaymentModel.create([{

            orderId: createdOrder._id,

            buyerId: payload.buyerId,

            amount: totalAmount,

            gateway: payload.paymentMethod,

            transactionId:
                `TXN-${Date.now()}`,

            status:
                payload.paymentMethod === "COD"
                    ? "SUCCESS"
                    : "PENDING",

        }], { session });

        // =====================================================
        // 9. COD DIRECT COMPLETE
        // =====================================================

        if (
            payload.paymentMethod === "COD"
        ) {

            await completeOrderAfterPayment({
                orderId:
                    createdOrder._id.toString(),

                transactionId:
                    payment[0].transactionId,

                session,
            });
        }

        await session.commitTransaction();

        return {

            success: true,

            message:
                "Buy now checkout successful",

            data: {

                order: createdOrder,

                payment: payment[0],
            }
        };

    } catch (error: any) {

        await session.abortTransaction();

        throw new Error(error.message);

    } finally {

        session.endSession();
    }
};

//get buyer all order
const getBuyerAllOrder = async (userDetails: IJwtPayload, query: Record<string,unknown>) => {

    const {profileId} = query;

    const {orderStatus} = query;

    const allOrder = await OrderItemModel.find({
        buyerId: profileId,
        status: orderStatus
    }).lean();

    return allOrder;

}


//retailer

//home page

const getRetailerHomePageOrderStatDataService = async (userDetails: IJwtPayload) => {

    const allOrder = await OrderModel.countDocuments({
        orderStatus: {
            $in: [

            ENUM_ORDER_STATUS.ACCEPTED,
            // ENUM_ORDER_STATUS.,
            // ENUM_ORDER_STATUS.ACCEPTED,
            ] 
        }
    });

    const readyOrder = await OrderModel.countDocuments({
        orderStatus: {
            $in: [

            ENUM_ORDER_STATUS.COMPLETED,
            // ENUM_ORDER_STATUS.,
            // ENUM_ORDER_STATUS.ACCEPTED,
            ] 
        }
    });

    let revenue = 0 ;

    let runningLowPairCount = 0;

    return {
        allOrder,
        readyOrder,
        revenue,
        runningLowPairCount
    }

}

//order page

const retailerAcceptOrderService = async (userDetails: IJwtPayload, orderId: string) => {
    const {profileId} = userDetails;

    // const {orderId,orderStatus} = query;

    const order = await OrderItemModel.findById(orderId);

    if( order.retailerId.toString() !== profileId){
        throw new ApiError(403,"You can not accept this order.");
    }

    order.status = ENUM_ORDER_STATUS.ACCEPTED;

    await order.save();

    //adjust inventory

    //send notification
    await notification.createNotification({
        toId: order?.buyerId,
        toModel: "Buyer",
        title: "Store keeper accepted your order.",
        description: `Store keeper accepted your order. View the order to check current status.`,
        // message?: string;
        type: ENUM_NOTIFICATION_TYPE.ORDER_ACCEPTED,
        referenceId: order._id,
        referenceModel: "Order",
        metadata: {}
    });
}

const getOrderDetailsById = async (orderId: string) => {
    // const {profileId} = userDetails;

    const order = await OrderItemModel.findById(orderId).lean();

    if(!order){
        throw new ApiError(404,"Failed to get order details.");
    }

    return order;
}


const OrderServices = { 
    placeNewOrderService,
    getRetailerHomePageOrderStatDataService,
    retailerAcceptOrderService,
    getOrderDetailsById,
 };

export default OrderServices;