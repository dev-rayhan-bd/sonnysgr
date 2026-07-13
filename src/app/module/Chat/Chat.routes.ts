import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import ChatValidations from "./Chat.validation";
import ChatController from "./Chat.controller";
import { uploadProfile } from "../../middlewares/multerMiddleware";


const ChatRouter = express.Router();

ChatRouter.post(
    "/initiate-chat",
    authorizeUser,
    validateRequest(ChatValidations.initiateChatZodSchema),
    ChatController.initiateChat
);

ChatRouter.get(
    "/get-all-messages",
    authorizeUser,
    // validateRequest(ChatValidations.initiateChatZodSchema),
    ChatController.getALLmessages
);

//upload inage file in chat
ChatRouter.post(
  "/upload-chat-files",
  uploadProfile.array("chat-files", 5),
  ChatController.uploadChatFilesController
);

//delete chat file
ChatRouter.delete(
  "/delete-chat-file",
//   uploadChatFiles.array("chat-files", 5),
  ChatController.deleteChatFilesController
);



export default ChatRouter;