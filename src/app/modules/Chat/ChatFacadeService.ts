import { IJwtPayload } from "../../../interface/jwt.interface";
import { ChatConversationSubService } from "./subServices/ChatConversationSubService";
import { ChatMessageSubService } from "./subServices/ChatMessageSubService";
import { ChatOfferCardSubService } from "./subServices/ChatOfferCardSubService";
import { IOfferCardPayload, IOrderCardPayload, IProductCardPayload, TContextType, TMessageType } from "./Chat.interface";

export class ChatFacadeService {
  static async initiateOrGetConversation(
    user: IJwtPayload,
    payload: {
      counterpartyId: string;
      counterpartyRole: "Buyer" | "Retailer" | "Reseller";
      contextType?: TContextType;
      contextId?: string;
    }
  ) {
    return ChatConversationSubService.initiateOrGetConversation(user, payload);
  }

  static async getUserConversations(user: IJwtPayload) {
    return ChatConversationSubService.getUserConversations(user);
  }

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
    return ChatMessageSubService.sendMessage(user, payload);
  }

  static async getConversationMessages(
    user: IJwtPayload,
    conversationId: string,
    query: { page?: number; limit?: number }
  ) {
    return ChatMessageSubService.getConversationMessages(user, conversationId, query);
  }

  static async syncOfferCard(payload: {
    senderId: string;
    senderModel: "Buyer" | "Retailer" | "Reseller" | "User";
    receiverId: string;
    receiverModel: "Buyer" | "Retailer" | "Reseller" | "User";
    offerCard: IOfferCardPayload;
    text?: string;
  }) {
    return ChatOfferCardSubService.syncOfferCardToChat(payload);
  }
}

