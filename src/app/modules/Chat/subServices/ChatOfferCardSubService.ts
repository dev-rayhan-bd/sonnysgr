import mongoose, { Types } from "mongoose";
import { ConversationModel, MessageModel } from "../Chat.model";
import { IOfferCardPayload } from "../Chat.interface";
import { getIO } from "../../../utils/socket";

export class ChatOfferCardSubService {
  /**
   * Inject or update an interactive offer card in the conversation thread.
   */
  static async syncOfferCardToChat(payload: {
    senderId: string;
    senderModel: "Buyer" | "Retailer" | "Reseller" | "User";
    receiverId: string;
    receiverModel: "Buyer" | "Retailer" | "Reseller" | "User";
    offerCard: IOfferCardPayload;
    text?: string;
  }) {
    const senderObjectId = new Types.ObjectId(payload.senderId);
    const receiverObjectId = new Types.ObjectId(payload.receiverId);

    // Find or create conversation
    let conversation = await ConversationModel.findOne({
      participants: { $all: [senderObjectId, receiverObjectId] },
    });

    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [senderObjectId, receiverObjectId],
        buyer: payload.senderModel === "Buyer" ? senderObjectId : receiverObjectId,
        retailer:
          payload.senderModel === "Retailer" ? senderObjectId : receiverObjectId,
        conversationType:
          payload.senderModel === "Reseller" || payload.receiverModel === "Reseller"
            ? "RESELLER_RETAILER"
            : "BUYER_RETAILER",
        contextType: "OFFER",
        contextId: payload.offerCard.offerId,
        status: "Accepted",
        lastMessageAt: new Date(),
      });
    }

    const message = await MessageModel.create({
      conversationId: conversation._id,
      sender: senderObjectId,
      senderModel: payload.senderModel,
      receiver: receiverObjectId,
      receiverModel: payload.receiverModel,
      text: payload.text || `Offer update: $${payload.offerCard.amount}`,
      messageType: "OFFER_CARD",
      offerPayload: payload.offerCard,
      seen: false,
    });

    await ConversationModel.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      lastMessageText: `🤝 Offer: $${payload.offerCard.amount} (${payload.offerCard.status})`,
      lastMessageAt: new Date(),
    });

    try {
      const io = getIO();
      io.to(payload.receiverId).emit("new_message", message);
      io.to(payload.receiverId).emit("offer_updated", payload.offerCard);
      io.to(payload.senderId).emit("offer_updated", payload.offerCard);
      io.to(conversation._id.toString()).emit("new_message", message);
    } catch (e) {
      // Non-blocking socket broadcast
    }

    return message;
  }
}
