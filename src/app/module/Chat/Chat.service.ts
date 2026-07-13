import mongoose from "mongoose";
import { ConversationModel, MessageModel } from "./Chat.model";
import { getIO } from "../../../socket/socket.connection";
import ApiError from "../../../error/ApiError";
import UserModel from "../User/User.model";
// import notification from "../../../helper/sendNotification";
import { ENUM_NOTIFICATION_TYPE, ENUM_USER_Type } from "../../../utilities/enum";
import { emitResult } from "../../../socket/emitResult";
import notification from "../../../helper/notification";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { populate } from "dotenv";

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
export const getChatList = async (role: string, userId: string) => {

  console.log("getChatList called with:", { role, userId });

  const objectUserId = new mongoose.Types.ObjectId(userId);

  
const pipeline: any = [
      {
        $match: {
          ...(role === ENUM_USER_Type.RESELLER ? { reseller: objectUserId } : { retailer: objectUserId }),
        },
      },

      {
        $lookup: {
          from: role === ENUM_USER_Type.RESELLER ? "retailers" : "resellers",
          localField: role === ENUM_USER_Type.RESELLER ? "retailer" : "reseller",
          foreignField: "_id",
          as: "receiver",
        },
      },

      {
        $unwind: "$receiver",
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
        $project: {
          _id: 1,
          // status: 1,
          // updatedAt: 1,

          receiver: {
            _id: "$receiver._id",
            name: "$receiver.name",
            image: "$receiver.image",
          },

          lastMessage: {
            // _id: "$lastMessage._id",
            text: "$lastMessage.text",
            // sender: "$lastMessage.sender",
            // receiver: "$lastMessage.receiver",
            // seen: "$lastMessage.seen",
            // createdAt: "$lastMessage.createdAt",
          },
        },
      },

      {
        $sort: {
          "lastMessage.createdAt": -1,
          updatedAt: -1,
        },
      },
];

    try {
        
        const chats = await ConversationModel.aggregate(pipeline);

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
export const sendMessage = async ( role: string, senderId: string,receiverId: string,text: string, attachments: any[] = [] ) => {
  console.log("sendMessage called with:", { role, senderId, receiverId, text, attachments });
    try {
        const io = getIO();
        
        let conversation:any = await ConversationModel.findOne({
         $or: [
            { reseller: senderId, retailer: receiverId },
            { reseller: receiverId, retailer: senderId }
          ]
        });
        //   // status: "Accepted"
        // });
        
        //create conversation if not available
        if (!conversation) {
          conversation = await ConversationModel.create({
            reseller: senderId,
            retailer: receiverId,
            status: "Accepted"
          });
      
          if(!conversation){
              throw new ApiError(500,"Failed to create new conversation.");
          }
      
        }

        let parsedAttachments = [];

        //attachments can be string or array, if string then parse it
        if (attachments) {
          parsedAttachments = typeof attachments === "string" ? JSON.parse(attachments) : attachments;
        }
        // console.log("Parsed attachments:", parsedAttachments);
        
        const message = await MessageModel.create({
          conversationId: conversation._id,
          sender: senderId,
          receiver: receiverId,
          text,
          attachments: parsedAttachments
        });
      
        conversation.lastMessage = message._id;
        await conversation.save();
      
        //send message to both user
        io.to(receiverId).emit("new_message", emitResult({
          statusCode: 200,
          success: true,
          message: `You have received a new message.`,
          data: message,
        }));
        // io.to(senderId).emit("new_message", message);

        const user: any = await UserModel.findById(senderId).select("name").lean();

        //send a notification to receiver
        // await notification.createNotification({
        //     toId: receiverId as string,
        //     toModel: "User",
        //     title: `${user?.name} has sent a new message.`,
        //     description: `${text}`,
        //     type: ENUM_NOTIFICATION_TYPE.SENT_MESSAGE,
        //     referenceId: conversation?._id,
        //     referenceModel: "Conversation",
        //     metadata: {
        //       isBlocked: conversation?.isBlocked
        //     }
        // });

        //send notification to sender
        // await notification.createNotification({
        //     toId: senderId as string,
        //     toModel: "User",
        //     title: `You have sent a new message.`,
        //     description: `Go to chat to check message.`,
        //     type: ENUM_NOTIFICATION_TYPE.SENT_MESSAGE,
        //     referenceId: conversation?._id,
        //     referenceModel: "Conversation"
        // });
      
        // update chat list
        // const senderChats = await getChatList(senderId);
        // const receiverChats = await getChatList(receiverId);
      
        // io.to(senderId).emit("chat_list", senderChats);
        // io.to(receiverId).emit("chat_list", receiverChats);
      
        return message;
    } catch (error) {
        console.log(error);
        // emitError(
        //   socket,
        //   error?.statusCode || 500,
        //   error?.message || "Send message failed"
        // );
        // throw new ApiError(500,"Send new message error.");
    }

};


//rest api

export const initiateConversation = async (userDetails: IJwtPayload, payload: { senderId: string; receiverId: string }) => {
  // console.log("Initiate conversation called with:", { userDetails, payload });

  let {  receiverId } = payload;
  let senderId = userDetails.profileId;

  // userDetails.role === ENUM_USER_Type.RESELLER ? senderId = userDetails.profileId  :  receiverId = userDetails.profileId;
  // userDetails.role === ENUM_USER_Type.RESELLER ? receiverId = payload.receiverId : senderId = payload.receiverId;

  if (userDetails.role === ENUM_USER_Type.RESELLER) {

    senderId = userDetails.profileId;
    receiverId = payload.receiverId;
  } else {

    receiverId = userDetails.profileId;
    senderId = payload.receiverId;
  }

  // Find existing conversation
  let conversation: any = await ConversationModel.findOne({
    reseller: senderId,
    retailer: receiverId,
  })
    .populate({ 
      path: "reseller",
      select: "name image",
    })
    .populate({
      path: "retailer",
      select: "name image",
    })
   .lean();

    console.log("Existing conversation:", conversation);

  // Create if doesn't exist
  if (!conversation) {

    conversation = await ConversationModel.create({
      reseller: senderId,
      retailer: receiverId,
      status: "Accepted",
    });

    conversation = await ConversationModel.findById(conversation._id)
        .populate({
          path: "reseller",
          select: "name image",
        })
        .populate({
          path: "retailer",
          select: "name image",
        })
        .lean();

    // Send notification only for new conversation
    await notification.createNotification({
      toId: receiverId,
      toModel: "Buyer",
      title: `A reseller started a new conversation with you.`,
      type: ENUM_NOTIFICATION_TYPE.STARTED_CONVERSATION,
      referenceId: conversation._id,
      referenceModel: "Conversation",
      metadata: {},
    });
  }

  
  // Get all previous messages
  const messages = await MessageModel.find({
    conversationId: conversation._id,
  })
  .sort({ createdAt: 1 })
  .lean();
  
  // Find the other participant
  const receiver = userDetails.role === ENUM_USER_Type.RESELLER ? conversation.retailer : conversation.reseller;

  console.log("Receiver details:", receiver);

  return {
    conversationId: conversation._id,
    // status: conversation.status,
    receiver, // Assuming the receiver is always the retailer
    // lastMessage: conversation.lastMessage,
    messages,
  };
};

export const getAllMessages = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {

  const { conversationId } = query;

  const { profileId, role} = userDetails;

  if (!conversationId) {
    throw new ApiError(400, "Conversation ID is required.");
  }


  const messages = await MessageModel.find({conversationId}).sort({ createdAt: 1 }).lean();

        // 2️⃣ get conversation with participants
        const conversation:any = await ConversationModel.findById(conversationId)
          .populate("retailer", "name image")
          .populate("reseller", "name image")
          .lean();

        if (!conversation) {
          throw new Error("Conversation not found to get receiver name and image.");
        }

        // 3️⃣ find the OTHER user (receiver)
        // const receiver = conversation.participants.find(
        //   (user: any) => user._id.toString() !== profileId.toString()
        // );
      
        return  {
          
            conversationId: conversation._id,
            receiver: role === ENUM_USER_Type.RESELLER ? conversation.retailer : conversation.reseller,
            messages
    
        };
    

};