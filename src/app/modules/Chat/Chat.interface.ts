import { Types, Document } from "mongoose";

export type TConversationType = "BUYER_RETAILER" | "RESELLER_RETAILER" | "GENERAL";

export type TContextType = "PRODUCT" | "ORDER" | "OFFER" | "STORE_INQUIRY" | "GENERAL";

export type TMessageType = "TEXT" | "IMAGE" | "OFFER_CARD" | "PRODUCT_CARD" | "ORDER_STATUS" | "SYSTEM";

export interface IOfferCardPayload {
  offerId: Types.ObjectId;
  amount: number;
  counterAmount?: number;
  originalPrice?: number;
  platformFee?: number;
  netPayout?: number;
  status: "Pending" | "Countered" | "Accepted" | "Declined" | "Expired" | "Completed";
  expiresAt?: Date;
  itemTitle?: string;
  itemImage?: string;
  size?: string;
}

export interface IProductCardPayload {
  productId: Types.ObjectId;
  name: string;
  brand?: string;
  image?: string;
  price: number;
  size?: string;
  sku?: string;
}

export interface IOrderCardPayload {
  orderId: Types.ObjectId;
  orderNumber: string;
  orderType: string;
  orderStatus: string;
  totalAmount: number;
}

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  buyer?: Types.ObjectId;
  retailer?: Types.ObjectId;
  reseller?: Types.ObjectId;
  conversationType: TConversationType;
  contextType?: TContextType;
  contextId?: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  lastMessageText?: string;
  lastMessageAt?: Date;
  status: "Pending" | "Accepted" | "Archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  senderModel: "Buyer" | "Retailer" | "Reseller" | "User";
  receiver: Types.ObjectId;
  receiverModel: "Buyer" | "Retailer" | "Reseller" | "User";
  text?: string;
  attachments?: string[];
  messageType: TMessageType;
  offerPayload?: IOfferCardPayload;
  productPayload?: IProductCardPayload;
  orderPayload?: IOrderCardPayload;
  seen: boolean;
  seenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
