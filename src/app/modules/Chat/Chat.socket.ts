import { Socket } from "socket.io";
import { Types } from "mongoose";
import { ChatFacadeService } from "./ChatFacadeService";
import { MessageModel } from "./Chat.model";
import { NotificationModel } from "../Notification/Notification.model";

export const registerSocketHandlers = (socket: Socket) => {
  const user = socket.data?.user;
  if (!user) return;

  // Join a specific conversation thread room
  socket.on("join_chat", (data: { conversationId: string }) => {
    if (data?.conversationId) {
      socket.join(data.conversationId);
      console.log(`👤 User ${user.profileId} joined chat room: ${data.conversationId}`);
    }
  });

  // Leave a specific conversation thread room
  socket.on("leave_chat", (data: { conversationId: string }) => {
    if (data?.conversationId) {
      socket.leave(data.conversationId);
      console.log(`👤 User ${user.profileId} left chat room: ${data.conversationId}`);
    }
  });

  // Typing indicator
  socket.on("typing", (data: { conversationId: string; receiverId: string }) => {
    if (data?.receiverId) {
      socket.to(data.receiverId).emit("user_typing", {
        conversationId: data.conversationId,
        senderId: user.profileId,
      });
    }
  });

  // Stop typing indicator
  socket.on("stop_typing", (data: { conversationId: string; receiverId: string }) => {
    if (data?.receiverId) {
      socket.to(data.receiverId).emit("user_stop_typing", {
        conversationId: data.conversationId,
        senderId: user.profileId,
      });
    }
  });

  // Real-time send message via socket
  socket.on("send_message", async (data) => {
    try {
      const message = await ChatFacadeService.sendMessage(user, {
        conversationId: data.conversationId,
        text: data.text,
        attachments: data.attachments,
        messageType: data.messageType,
        offerPayload: data.offerPayload,
        productPayload: data.productPayload,
        orderPayload: data.orderPayload,
      });

      socket.emit("message_sent_ack", { success: true, data: message });
    } catch (err: any) {
      socket.emit("chat_error", {
        success: false,
        message: err.message || "Failed to send message",
      });
    }
  });

  // Retrieve user conversations via socket
  socket.on("get_conversations", async () => {
    try {
      const conversations = await ChatFacadeService.getUserConversations(user);
      socket.emit("conversations_list", conversations);
    } catch (err: any) {
      socket.emit("chat_error", {
        success: false,
        message: err.message || "Failed to retrieve conversations",
      });
    }
  });

  // Real-time mark conversation messages as seen
  socket.on("mark_seen", async (data: { conversationId: string }) => {
    try {
      if (data?.conversationId) {
        const result = await ChatFacadeService.markConversationAsSeen(user, data.conversationId);
        socket.emit("mark_seen_ack", { success: true, ...result });
      }
    } catch (err: any) {
      socket.emit("chat_error", {
        success: false,
        message: err.message || "Failed to mark messages as seen",
      });
    }
  });

  // Real-time request for all unread badge counts (Chat + Notifications)
  socket.on("get_badge_counts", async () => {
    try {
      const profileId = user.profileId;
      const userObjectId = new Types.ObjectId(profileId);

      const [unreadChatCount, unreadNotificationCount] = await Promise.all([
        MessageModel.countDocuments({ receiver: userObjectId, seen: false }),
        NotificationModel.countDocuments({ toId: userObjectId, isSeen: false }),
      ]);

      socket.emit("badge_counts", {
        unreadChatCount,
        unreadNotificationCount,
        totalBadgeCount: unreadChatCount + unreadNotificationCount,
      });
    } catch (err: any) {
      socket.emit("chat_error", {
        success: false,
        message: err.message || "Failed to fetch badge counts",
      });
    }
  });
};
