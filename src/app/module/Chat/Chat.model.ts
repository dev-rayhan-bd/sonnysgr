import  { Schema, models, model } from "mongoose";
import { IConversation, IMessage } from "./Chat.interface";

//conversation model schema
const conversationSchema = new Schema<IConversation>(
  {
     reseller: {
    type: Schema.Types.ObjectId,
    ref: "Reseller",
    required: true,
    },
    retailer: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
    },
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
    text: {
      type: String, 
      // required: true,
      default: ""
    },
     attachments: {
      type: [String],
      default: []
     },
    seen: {
      type: Boolean,
      default: false,
    },
    createdAt: {type: Date, default: Date.now}
  }
);

//indexs
conversationSchema.index({ participants: 1 });

messageSchema.index({ conversationId: 1 });

messageSchema.index({ sender: 1, receiver: 1 });


export const MessageModel = models.Message || model<IMessage>("Message", messageSchema);

export const ConversationModel =  models.Conversation || model<IConversation>("Conversation",conversationSchema);