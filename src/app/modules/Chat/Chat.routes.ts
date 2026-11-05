import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import ChatValidations from "./Chat.validation";
import ChatController from "./Chat.controller";
import { uploadChatFiles } from "../../middleware/multerMiddleware";

const ChatRouter = express.Router();

const allowedRoles = ["Buyer", "Retailer", "Reseller", "Super Admin"];

// Initiate or retrieve an existing conversation thread
ChatRouter.post(
  "/initiate-chat",
  auth(allowedRoles),
  validateRequest(ChatValidations.initiateChatZodSchema),
  ChatController.initiateChat
);

// Get all active conversation threads for authenticated user
ChatRouter.get(
  "/conversations",
  auth(allowedRoles),
  ChatController.getUserConversations
);

// Send message / interactive card
ChatRouter.post(
  "/send-message",
  auth(allowedRoles),
  validateRequest(ChatValidations.sendMessageZodSchema),
  ChatController.sendMessage
);

// Get paginated message history for a conversation thread
ChatRouter.get(
  "/messages/:conversationId",
  auth(allowedRoles),
  validateRequest(ChatValidations.getMessagesQueryZodSchema),
  ChatController.getConversationMessages
);

// Upload multi-cloud chat media (Cloudinary default / S3 auto-switch, 500MB max)
ChatRouter.post(
  "/upload-chat-files",
  auth(allowedRoles),
  uploadChatFiles.array("chat-files", 5),
  ChatController.uploadChatFilesController
);

// Delete uploaded chat media
ChatRouter.delete(
  "/delete-chat-file",
  auth(allowedRoles),
  ChatController.deleteChatFilesController
);

export default ChatRouter;
