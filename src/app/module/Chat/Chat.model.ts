import  { Schema, models, model } from "mongoose";
import { IConversation, IMessage } from "./Chat.interface";

//conversation model schema
const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "Reseller",
        required: true,
      },
      {
        type: Schema.Types.ObjectId,
        ref: "Retailer",
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted"],
      default: "Accepted"
    }
  },
  { timestamps: true }
);


//Message model schema
const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    text: {type: String, required: true},
    seen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

//indexs
conversationSchema.index({ participants: 1 });

messageSchema.index({ conversationId: 1 });

messageSchema.index({ sender: 1, receiver: 1 });


export const MessageModel = models.Message || model<IMessage>("Message", messageSchema);

export const ConversationModel =  models.Conversation || model<IConversation>("Conversation",conversationSchema);