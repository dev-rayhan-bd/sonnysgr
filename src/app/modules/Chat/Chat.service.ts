import { ChatFacadeService } from "./ChatFacadeService";

export const initiateConversation = (user: any, payload: any) =>
  ChatFacadeService.initiateOrGetConversation(user, payload);

export const getAllMessages = (user: any, query: any) =>
  ChatFacadeService.getConversationMessages(user, query.conversationId, query);

export const getUserConversations = (user: any) =>
  ChatFacadeService.getUserConversations(user);

export const sendMessage = (user: any, payload: any) =>
  ChatFacadeService.sendMessage(user, payload);

export default ChatFacadeService;
