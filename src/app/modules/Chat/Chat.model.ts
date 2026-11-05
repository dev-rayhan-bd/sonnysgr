import { Schema, models, model } from "mongoose";
import { IConversation, IMessage } from "./Chat.interface";

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    ],
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
    },
    retailer: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
    },
    reseller: {
      type: Schema.Types.ObjectId,
      ref: "Reseller",
    },
    conversationType: {
      type: String,
      enum: ["BUYER_RETAILER", "RESELLER_RETAILER", "GENERAL"],
      default: "BUYER_RETAILER",
    },
    contextType: {
      type: String,
      enum: ["PRODUCT", "ORDER", "OFFER", "STORE_INQUIRY", "GENERAL"],
      default: "GENERAL",
    },
    contextId: {
      type: Schema.Types.ObjectId,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageText: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Archived"],
      default: "Accepted",
    },
  },
  { timestamps: true }
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    senderModel: {
      type: String,
      enum: ["Buyer", "Retailer", "Reseller", "User"],
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    receiverModel: {
      type: String,
      enum: ["Buyer", "Retailer", "Reseller", "User"],
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    attachments: {
      type: [String],
      default: [],
    },
    messageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "OFFER_CARD", "PRODUCT_CARD", "ORDER_STATUS", "SYSTEM"],
      default: "TEXT",
    },
    offerPayload: {
      offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
      amount: { type: Number },
      counterAmount: { type: Number },
      originalPrice: { type: Number },
      platformFee: { type: Number },
      netPayout: { type: Number },
      status: { type: String },
      expiresAt: { type: Date },
      itemTitle: { type: String },
      itemImage: { type: String },
      size: { type: String },
    },
    productPayload: {
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      name: { type: String },
      brand: { type: String },
      image: { type: String },
      price: { type: Number },
      size: { type: String },
      sku: { type: String },
    },
    orderPayload: {
      orderId: { type: Schema.Types.ObjectId, ref: "Order" },
      orderNumber: { type: String },
      orderType: { type: String },
      orderStatus: { type: String },
      totalAmount: { type: Number },
    },
    seen: {
      type: Boolean,
      default: false,
      index: true,
    },
    seenAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound indexes for optimal aggregation performance
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ buyer: 1, retailer: 1 });
conversationSchema.index({ reseller: 1, retailer: 1 });
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, seen: 1 });

export const MessageModel = models.Message || model<IMessage>("Message", messageSchema);
export const ConversationModel =
  models.Conversation || model<IConversation>("Conversation", conversationSchema);
