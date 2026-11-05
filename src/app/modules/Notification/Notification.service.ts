import { JwtPayload } from "jsonwebtoken";
import ApiError from "../../../error/ApiError";
import { INotification } from "./Notification.interface";
import { AdminNotificationModel, NotificationModel } from "./Notification.model";
import { getIO } from "../../../socket/socket.connection";

const getAllNotificationService = async (
  userDetails: JwtPayload,
  query: Record<string, unknown>
) => {
  const { profileId } = userDetails;

  let { page, limit } = query;
  page = parseInt(page as any) || 1;
  limit = parseInt(limit as any) || 10;
  const skip = ((page as number) - 1) * (limit as number);

  const [notifications, totalNotifications] = await Promise.all([
    NotificationModel.find({ toId: profileId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit as number)
      .lean(),
    NotificationModel.countDocuments({ toId: profileId }),
  ]);

  const totalPage = Math.ceil(totalNotifications / (limit as number));
  const hasNextPage = (page as number) < totalPage;

  return {
    meta: {
      page,
      limit,
      total: totalNotifications,
      totalPage,
      hasNextPage,
    },
    notifications,
    notificationCount: notifications.length,
  };
};

const deleteNotification = async (id: string) => {
  const deletedNotification = await NotificationModel.findByIdAndDelete(id);
  if (!deletedNotification) {
    throw new ApiError(500, "Failed to delete notification");
  }
  return deletedNotification;
};

// Dashboard / Admin notifications
const deleteAdminNotification = async (id: string) => {
  const deletedNotification = await AdminNotificationModel.findByIdAndDelete(id);
  if (!deletedNotification) {
    throw new ApiError(500, "Failed to delete notification");
  }
  return deletedNotification;
};

const getAllAdminNotificationService = async () => {
  return await AdminNotificationModel.find({}).sort({ createdAt: -1 }).lean();
};

const makeNotificationSeen = async (id: string) => {
  const updatedNotification = await NotificationModel.findByIdAndUpdate(
    id,
    { isSeen: true },
    { new: true }
  );

  if (!updatedNotification) {
    throw new ApiError(500, "Failed to update notification status.");
  }

  // Real-time notification badge count update via socket
  try {
    const io = getIO();
    const unreadNotificationCount = await NotificationModel.countDocuments({
      toId: updatedNotification.toId,
      isSeen: false,
    });
    io.to(updatedNotification.toId.toString()).emit("notification_badge_count", {
      unreadNotificationCount,
    });
  } catch (err) {
    // Non-blocking socket error
  }

  return updatedNotification;
};

const makeAllNotificationSeen = async (userDetails: JwtPayload) => {
  const { profileId } = userDetails;
  const result = await NotificationModel.updateMany(
    { toId: profileId, isSeen: false },
    { $set: { isSeen: true } }
  );

  // Real-time notification badge count reset to 0
  try {
    const io = getIO();
    io.to(profileId.toString()).emit("notification_badge_count", {
      unreadNotificationCount: 0,
    });
  } catch (err) {
    // Non-blocking
  }

  return { modifiedCount: result.modifiedCount, unreadNotificationCount: 0 };
};

const makeAdminNotificationSeen = async (id: string) => {
  const updatedNotification = await AdminNotificationModel.findByIdAndUpdate(
    id,
    { isSeen: true },
    { new: true }
  );

  if (!updatedNotification) {
    throw new ApiError(500, "Failed to update notification status");
  }
  return updatedNotification;
};

const NotificationServices = {
  getAllNotificationService,
  getAllAdminNotificationService,
  deleteAdminNotification,
  deleteNotification,
  makeNotificationSeen,
  makeAllNotificationSeen,
  makeAdminNotificationSeen,
};

export default NotificationServices;
