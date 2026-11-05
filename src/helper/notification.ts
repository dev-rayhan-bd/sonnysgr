import { NotificationModel } from "../app/modules/Notification/Notification.model";
import { getIO } from "../socket/socket.connection";
import { ENUM_NOTIFICATION_TYPE } from "../utilities/enum";

// Create and broadcast new notification
class NotificationService {
  async createNotification(payload: {
    toId: string;
    toModel: string;
    title: string;
    description?: string;
    message?: string;
    type: string;
    referenceId?: string;
    referenceModel?: string;
    metadata?: any;
  }) {
    const notification = await NotificationModel.create(payload);

    // Emit real-time event & notification badge count
    try {
      const io = getIO();
      // 🔥 Emit to specific user room
      io.to(payload.toId).emit("new-notification", notification);

      // 🔥 Emit updated unread notification count badge in real-time
      const unreadNotificationCount = await NotificationModel.countDocuments({
        toId: payload.toId,
        isSeen: false,
      });
      io.to(payload.toId).emit("notification_badge_count", {
        unreadNotificationCount,
      });
    } catch (err) {
      // Non-blocking socket error
    }

    return notification;
  }
}

export default new NotificationService();
