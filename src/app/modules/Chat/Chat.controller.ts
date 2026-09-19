import catchAsync from "../../../utilities/catchasync";
import { getAllMessages, initiateConversation } from "./Chat.service";
import sendResponse from "../../../utilities/sendResponse";
import deleteOldFile from "../../../utilities/deleteFile";
import { AuthRequest } from "../../../interface/authRequest";






const initiateChat = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;
    
    const result = await initiateConversation(user,req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Conversation initiated successfully.",
        data: result,
    });
});

const getALLmessages = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;
    
    const result = await getAllMessages(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Messages retrieved successfully.",
        data: result,
    });
});

//upload chat file

const uploadChatFilesController = catchAsync(async (req, res) => {

    // const { user } = req as AuthRequest;
    const files = req.files as Express.Multer.File[];

    const uploadedFiles = files.map((file) => { return  `uploads/chat-files/${file.filename}`;});

    console.log("Uploaded files:", uploadedFiles);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Files uploaded successfully",
        data: uploadedFiles,
    });
});

const deleteChatFilesController = catchAsync(async (req, res) => {

    const  fileKey  = req.query.imageUrl as string;
    // console.log("File key to delete:", fileKey);

    const result = await deleteOldFile(fileKey);
    // console.log("Delete result:", result);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "File deleted successfully",
        data: result,
    });
});


const ChatController = {
    initiateChat,
    getALLmessages,
    uploadChatFilesController,
    deleteChatFilesController
};

export default ChatController;