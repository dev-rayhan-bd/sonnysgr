import { Types,Document } from "mongoose";

export interface IConversation extends Document {
  reseller: Types.ObjectId;
  retailer: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  status: string;
  updatedAt: Date;
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  text: string;
  attachments?: string[];
  seen: boolean;
  createdAt: Date;
}