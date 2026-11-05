import { Types } from "mongoose";

export interface ICart {
  buyerId: Types.ObjectId;
  productId: Types.ObjectId;
  retailerId: Types.ObjectId;
  variantId?: Types.ObjectId;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  selectedSize: string | number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TCartItem = {
  productId: string | Types.ObjectId;
  variantId?: string | Types.ObjectId;
  selectedSize: string | number;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
};

export type TShippingAddress = {
  name: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
};

export type TCheckoutCartPayload = {
  shippingAddress?: TShippingAddress;
  fulfillmentType?: "DELIVERY" | "STORE_PICKUP";
  pickupTime?: Date;
  paymentMethod: string;
  promoCode?: string;
  notes?: string;
};
