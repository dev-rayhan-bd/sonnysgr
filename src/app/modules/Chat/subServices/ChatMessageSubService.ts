import mongoose, { Types } from "mongoose";
import { ConversationModel, MessageModel } from "../Chat.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IMessage, IOfferCardPayload, IOrderCardPayload, IProductCardPayload, TMessageType } from "../Chat.interface";
import { getIO } from "../../../utils/socket";

export class ChatMessageSubService {
  /**
   * Send a message or card within a conversation.
   */
  static async sendMessage(
    user: IJwtPayload,
    payload: {
      conversationId: string;
      text?: string;
      attachments?: string[];
      messageType?: TMessageType;
      offerPayload?: IOfferCardPayload;
      productPayload?: IProductCardPayload;
      orderPayload?: IOrderCardPayload;
    }
  ) {
    const userObjectId = new Types.ObjectId(user.profileId);
    const convObjectId = new Types.ObjectId(payload.conversationId);

    const conversation = await ConversationModel.findById(convObjectId);
    if (!conversation) {
      throw new AppError(StatusCodes.NOT_FOUND, "Conversation thread not found");
    }

    const isParticipant = conversation.participants.some((p: Types.ObjectId) =>
      p.equals(userObjectId)
    );
    if (!isParticipant) {
      throw new AppError(StatusCodes.FORBIDDEN, "You are not a participant in this conversation");
    }

    // Determine receiver
    const receiverId = conversation.participants.find(
      (p: Types.ObjectId) => !p.equals(userObjectId)
    );
    if (!receiverId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Receiver could not be identified");
    }

    // Determine receiverModel based on conversation fields
    let receiverModel: "Buyer" | "Retailer" | "Reseller" | "User" = "User";
    if (conversation.buyer && conversation.buyer.equals(receiverId)) {
      receiverModel = "Buyer";
    } else if (conversation.retailer && conversation.retailer.equals(receiverId)) {
      receiverModel = "Retailer";
    } else if (conversation.reseller && conversation.reseller.equals(receiverId)) {
      receiverModel = "Reseller";
    }

    const messageType = payload.messageType || (payload.attachments?.length ? "IMAGE" : "TEXT");

    const message = await MessageModel.create({
      conversationId: convObjectId,
      sender: userObjectId,
      senderModel: (user.role as any) || "User",
      receiver: receiverId,
      receiverModel,
      text: payload.text || "",
      attachments: payload.attachments || [],
      messageType,
      offerPayload: payload.offerPayload,
      productPayload: payload.productPayload,
      orderPayload: payload.orderPayload,
      seen: false,
    });

    // Generate descriptive preview for conversation list
    let snippet = payload.text || "";
    if (messageType === "OFFER_CARD") snippet = "🤝 Offer Card: $" + (payload.offerPayload?.amount || "");
    else if (messageType === "PRODUCT_CARD") snippet = "👟 Product: " + (payload.productPayload?.name || "");
    else if (messageType === "IMAGE") snippet = "📷 Photo Attachment";

    // Update conversation snapshot atomically
    await ConversationModel.findByIdAndUpdate(convObjectId, {
      lastMessage: message._id,
      lastMessageText: snippet,
      lastMessageAt: new Date(),
    });

    // Real-time broadcast via Socket.io
    try {
      const io = getIO();
      io.to(receiverId.toString()).emit("new_message", message);
      io.to(convObjectId.toString()).emit("new_message", message);
    } catch (err) {
      // Non-blocking socket error
    }

    return message;
  }

  /**
   * Fetch paginated message history for a conversation thread (Zero .populate())
   */
  static async getConversationMessages(
    user: IJwtPayload,
    conversationId: string,
    query: { page?: number; limit?: number }
  ) {
    const userObjectId = new Types.ObjectId(user.profileId);
    const convObjectId = new Types.ObjectId(conversationId);

    const conversation = await ConversationModel.findById(convObjectId).lean();
    if (!conversation) {
      throw new AppError(StatusCodes.NOT_FOUND, "Conversation thread not found");
    }

    const isParticipant = (conversation as any).participants.some((p: Types.ObjectId) =>
      p.equals(userObjectId)
    );
    if (!isParticipant) {
      throw new AppError(StatusCodes.FORBIDDEN, "Access forbidden to this conversation history");
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 30);
    const skip = (page - 1) * limit;

    const total = await MessageModel.countDocuments({ conversationId: convObjectId });
    const messages = await MessageModel.find({ conversationId: convObjectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Mark unread messages directed to this user as seen
    const unreadUpdated = await MessageModel.updateMany(
      {
        conversationId: convObjectId,
        receiver: userObjectId,
        seen: false,
      },
      {
        $set: { seen: true, seenAt: new Date() },
      }
    );

    if (unreadUpdated.modifiedCount > 0) {
      try {
        const io = getIO();
        const otherParticipant = (conversation as any).participants.find(
          (p: Types.ObjectId) => !p.equals(userObjectId)
        );
        if (otherParticipant) {
          io.to(otherParticipant.toString()).emit("messages_seen", {
            conversationId,
            seenBy: user.profileId,
            seenAt: new Date(),
          });
        }
      } catch (e) {
        // Non-blocking socket error
      }
    }

    // Return chronological order for UI display
    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: messages.reverse(),
    };
  }
}
