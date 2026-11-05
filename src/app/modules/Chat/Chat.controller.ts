import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { ChatFacadeService } from "./ChatFacadeService";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { uploadMultipleToCloud, deleteFromCloud } from "../../../helper/cloudStorage";
import AppError from "../../errors/AppError";

const initiateChat = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await ChatFacadeService.initiateOrGetConversation(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Conversation thread initialized successfully",
    data: result,
  });
});

const getUserConversations = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await ChatFacadeService.getUserConversations(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Conversation threads retrieved successfully",
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await ChatFacadeService.sendMessage(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

const getConversationMessages = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const conversationId = req.params.conversationId as string;
  const result = await ChatFacadeService.getConversationMessages(
    user,
    conversationId,
    req.query as any
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Messages retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const markConversationAsSeenController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const conversationId = req.params.conversationId as string;
  const result = await ChatFacadeService.markConversationAsSeen(user, conversationId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Conversation messages marked as seen",
    data: result,
  });
});

const uploadChatFilesController = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || !files.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "No chat attachment files provided");
  }

  const uploadResults = await uploadMultipleToCloud(files, "gosnkr/chat");
  const fileUrls = uploadResults.map((item) => item.url);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chat files uploaded successfully",
    data: {
      urls: fileUrls,
      files: uploadResults,
    },
  });
});

const deleteChatFilesController = catchAsync(async (req: Request, res: Response) => {
  const fileKey = (req.query.fileKey || req.query.imageUrl) as string;
  if (!fileKey) {
    throw new AppError(StatusCodes.BAD_REQUEST, "File key/URL required for deletion");
  }

  await deleteFromCloud(fileKey);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chat file deleted successfully",
    data: null,
  });
});

const ChatController = {
  initiateChat,
  getUserConversations,
  sendMessage,
  getConversationMessages,
  markConversationAsSeen: markConversationAsSeenController,
  uploadChatFilesController,
  deleteChatFilesController,
};

export default ChatController;
