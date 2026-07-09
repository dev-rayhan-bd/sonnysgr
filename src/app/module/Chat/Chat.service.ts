import mongoose from "mongoose";
import { ConversationModel, MessageModel } from "./Chat.model";
import { getIO } from "../../../socket/socket.connection";
import ApiError from "../../../error/ApiError";
import UserModel from "../User/User.model";
// import notification from "../../../helper/sendNotification";
import { ENUM_NOTIFICATION_TYPE } from "../../../utilities/enum";
import { emitResult } from "../../../socket/emitResult";
import notification from "../../../helper/notification";

//send request
export const sendConversationRequest = async (
  senderId: string,
  receiverId: string
) => {

  const existing = await ConversationModel.findOne({
    participants: { $all: [senderId, receiverId] }
  }).populate({ path: "participants", select: "name image" });

  if (existing) return existing;

  const conversation: any = await ConversationModel.create({
    participants: [senderId, receiverId],
    status: "Accepted"
  })
  // .populate({ path: "participants", select: "name image" }).lean();

  const io = getIO();

  //send response to receiver
  io.to(receiverId).emit("new_conversation_request", emitResult({
        statusCode: 201,
        success: true,
        message: `You have received a new conversation request`,
        data: conversation,
      }));
  //send response to
  io.to(senderId).emit("new_conversation_request", emitResult({
        statusCode: 201,
        success: true,
        message: `You have requested for a new conversation .`,
        data: conversation,
      }));

  //send a notification
  await notification.createNotification({
      toId: receiverId as string,
      toModel: "Buyer",
      title: `A reseller started a new conversation with you.`,
      type: ENUM_NOTIFICATION_TYPE.STARTED_CONVERSATION,
      referenceId: conversation?._id,
      referenceModel: "Conversation",
      metadata: {}
  });

  return conversation;
};

//get all request
// export const getConversationRequests = async (userId: string) => {

//   const io = getIO();

//   const requests = await ConversationModel.find({
//     participants: userId,
//     status: "Pending"
//   }).populate("participants", "name profileImage");


//   //send response to receiver
//   io.to(userId).emit("conversation_requests", emitResult({
//         statusCode: 200,
//         success: true,
//         message: `You have retrieved all conversation requests.`,
//         data: requests,
//       }));

//   return requests;
// };

//accept request
// export const acceptConversationRequest = async (conversationId: string) => {

//   const conversation = await ConversationModel.findByIdAndUpdate(
//     conversationId,
//     { status: "Accepted" },
//     { new: true }
//   );

//   const io = getIO();

//   conversation?.participants.forEach((userId: string) => {
//     io.to(userId.toString()).emit("conversation_accepted", emitResult({
//         statusCode: 200,
//         success: true,
//         message: `You have accepted a new conversation request.`,
//         data: conversation,
//       }));
//   });

//   //send response to receiver
//   // io.to(conversation.participants[1]).emit("conversation_accepted", emitResult({
//   //       statusCode: 200,
//   //       success: true,
//   //       message: `You have accepted a new conversation request.`,
//   //       data: conversation,
//   //     }));

//   //send a notification
//   await notification.createNotification({
//       toId: conversation.participants[0] as string,
//       toModel: "User",
//       title: `User accepted your conversation request.`,
//       type: ENUM_NOTIFICATION_TYPE.ACCEPT_WAVE,
//       referenceId: conversation?._id,
//       referenceModel: "Conversation"
//   });

//   return conversation;
// };

//get chatlist
export const getChatList = async (userId: string) => {
    try {
        
        const chats = await ConversationModel.aggregate([
          {
            $match: {
              participants: new mongoose.Types.ObjectId(userId),
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "participants",
              foreignField: "_id",
              as: "users",
            },
          },
          {
            $lookup: {
              from: "messages",
              localField: "lastMessage",
              foreignField: "_id",
              as: "lastMessage",
            },
          },
          {
            $unwind: {
              path: "$lastMessage",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              otherUser: {
                $filter: {
                  input: "$users",
                  as: "user",
                  cond: {
                    $ne: ["$$user._id", new mongoose.Types.ObjectId(userId)],
                  },
                },
              },
            },
          },
          {
            $unwind: "$otherUser",
          },
          {
            $sort: {
              updatedAt: -1,
            },
          },
          {
            $project: {
              _id: 1,
              "otherUser.name": 1,
              "otherUser.image": 1,
              lastMessage: "$lastMessage.text",
              time: "$lastMessage.createdAt",
            },
          },
        ]);
      
        return chats;
        
    } catch (error) {
        console.log(error);
        throw new ApiError(500,"Error in get chat list.");
    }

};

//get all message from user
export const getMessages = async (conversationId: string) => {

    try {   
        const messages = await MessageModel.find({
          conversationId,
        }).sort({ createdAt: 1 });
      
        return messages;
    } catch (error) {
        console.log(error);
        console.log(500,"Error In get all message.");
    }

};

//search user by name
// export const searchUsers = async (search: string) => {
//   const users = await UserModel.find({
//     name: { $regex: search, $options: "i" },
//   }).select("name image");

//   return users;
// };

//send new message service function
export const sendMessage = async ( senderId: string,receiverId: string,text: string ) => {

    try {
        
        let conversation = await ConversationModel.findOne({
          participants: { $all: [senderId, receiverId] },
          status: "Accepted"
        });
        
        //create conversation if not available
        if (!conversation) {
          conversation = await ConversationModel.create({
            participants: [senderId, receiverId],
          });
      
          if(!conversation){
              throw new ApiError(500,"Failed to create new conversation.");
          }
      
        }
      
        const message = await MessageModel.create({
          conversationId: conversation._id,
          sender: senderId,
          receiver: receiverId,
          text,
        });
      
        conversation.lastMessage = message._id;
        await conversation.save();
      
        const io = getIO();
      
        //send message to both user
        io.to(receiverId).emit("new_message", emitResult({
          statusCode: 201,
          success: true,
          message: `You have received a new message.`,
          data: message,
        }));
        // io.to(senderId).emit("new_message", message);
      
        // update chat list
        // const senderChats = await getChatList(senderId);
        // const receiverChats = await getChatList(receiverId);
      
        // io.to(senderId).emit("chat_list", senderChats);
        // io.to(receiverId).emit("chat_list", receiverChats);
      
        return message;
    } catch (error) {
        console.log(error);
        throw new ApiError(500,"Send new message error.");
    }

};