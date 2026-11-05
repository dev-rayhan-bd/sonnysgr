import { Types } from "mongoose";

export interface IOrder {
  _id?: Types.ObjectId;
  buyerId: Types.ObjectId;
  orderNumber: string;
  subtotal: number;
  shippingCharge: number;
  discountAmount: number;
  totalAmount: number;
  totalItems: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  orderType: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    lat: number;
    lng: number;
    city: string;
    area?: string;
  };
  holdingTime?: number; // hours
  holdingStartTime?: Date;
  holdingEndTime?: Date;
  partialPayment?: number; // deposit paid upfront (e.g. $30 or 20%)
  pickupVerificationCode?: string; // 6-digit dropoff/pickup verification code (GS-HOLD-XXXXXX)
  pickupTime: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderItem {
  _id?: Types.ObjectId;
  orderId: Types.ObjectId;
  buyerId: Types.ObjectId;
  retailerId: Types.ObjectId;
  productId: Types.ObjectId;
  productSnapshot: {
    name: string;
    image: string;
    brand: string;
  };
  selectedSize: number | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  pickupTime?: Date;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
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
};
