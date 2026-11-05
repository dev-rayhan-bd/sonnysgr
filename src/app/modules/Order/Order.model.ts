import { model, Schema, models } from "mongoose";
import { IOrder, IOrderItem } from "./Order.interface";
import {
  ENUM_ORDER_ITEM_STATUS,
  ENUM_ORDER_STATUS,
  ENUM_ORDER_TYPE,
  ENUM_PAYMENT_METHOD,
  ENUM_PAYMENT_STATUS,
} from "../../../utilities/enum";

// Order model schema
const OrderSchema = new Schema<IOrder>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },

    subtotal: { type: Number, required: true },
    shippingCharge: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    totalItems: { type: Number, required: true },

    orderStatus: {
      type: String,
      enum: Object.values(ENUM_ORDER_STATUS),
      default: ENUM_ORDER_STATUS.PLACED,
      index: true,
    },
    orderType: {
      type: String,
      enum: Object.values(ENUM_ORDER_TYPE),
      default: ENUM_ORDER_TYPE.BUY_NOW,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(ENUM_PAYMENT_STATUS),
      default: ENUM_PAYMENT_STATUS.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(ENUM_PAYMENT_METHOD),
      default: ENUM_PAYMENT_METHOD.STRIPE,
    },

    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    holdingTime: { type: Number, default: 0 },
    holdingStartTime: { type: Date, default: null },
    holdingEndTime: { type: Date, default: null, index: true },
    partialPayment: { type: Number, default: 0 },
    pickupVerificationCode: { type: String, index: true },

    pickupTime: { type: Date, required: true },
  },
  { timestamps: true }
);

// Order Item model schema
const OrderItemSchema = new Schema<IOrderItem>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
    retailerId: { type: Schema.Types.ObjectId, ref: "Retailer", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    productSnapshot: {
      name: { type: String, required: true },
      image: { type: String, required: true },
      brand: { type: String, required: true },
    },
    selectedSize: { type: Schema.Types.Mixed, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    pickupTime: { type: Date },
    status: {
      type: String,
      enum: Object.values(ENUM_ORDER_ITEM_STATUS),
      default: ENUM_ORDER_ITEM_STATUS.PLACED,
      index: true,
    },
  },
  { timestamps: true }
);

export const OrderModel = models.Order || model<IOrder>("Order", OrderSchema);
export const OrderItemModel = models.OrderItem || model<IOrderItem>("OrderItem", OrderItemSchema);
