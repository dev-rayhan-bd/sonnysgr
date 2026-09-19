import { Types } from "mongoose";

export interface IOrder {
    buyerId: Types.ObjectId;
    // retailerId: Types.ObjectId;
    orderNumber: string;
    subtotal: number;
    shippingCharge: number;
    discountAmount: number;
    totalAmount: number;
    totalItems: number;
    // productId: Types.ObjectId;
    orderStatus: string;
    paymentStatus: string;
    paymentMethod: string;
    orderType: string;
    // selectedSize: number;
    // quantity: number;
    // unitPrice: number;
    // totalPrice: number;
     shippingAddress: {
        name: string;
        phone: string;
        address: string;
        lat: number;
        lng: number;
        city: string;
        area?: string;
    };

    holdingTime?: number;
    holdingStartTime?: Date;
    holdingEndTime?: Date;
    partialPayment?: number;

    pickupTime: Date;
    createdAt: Date;
}

export interface IOrderItem {
    orderId: Types.ObjectId;

    buyerId: Types.ObjectId;

    retailerId: Types.ObjectId;

    productId: Types.ObjectId;

    productSnapshot: {
        name: string;
        image: string;
        brand: string;
    };

    selectedSize: number;

    quantity: number;

    unitPrice: number;

    totalPrice: number;

    pickupTime?: Date;

    status: string;

    createdAt: Date;
}

export interface ISellerSplitOrder {
    orderId: Types.ObjectId;

    retailerId: Types.ObjectId;

    buyerId: Types.ObjectId;

    totalItems: number;

    totalAmount: number;

    status: string;

    createdAt: Date;
}

export type TOrderPayload = {
    retailerId: Types.ObjectId;
    productId: Types.ObjectId;
    orderType: string;
    selectedSize: number;
    quantity: number;
    unitPrice: number;
    pickupTime: Date;
}