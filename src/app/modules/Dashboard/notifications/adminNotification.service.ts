import ApiError from "../../../../error/ApiError";
import QueryBuilder from "../../../builder/QueryBuilder";
import AuthModel from "../../auth/auth.model";
import { AdminNotificationModel } from "../../Notification/Notification.model";
import NotificationHelper from "../../../../helper/notification";
import { ENUM_NOTIFICATION_TYPE } from "../../../../utilities/enum";

/**
 * Drop an entry into the shared admin inbox. Never throws — a failed inbox write must not
 * break the user-facing action (ticket, report, …) that triggered it.
 */
export const notifyAdmins = async (payload: {
  title: string;
  description?: string;
  type: string;
  referenceId?: unknown;
  referenceModel?: string;
}) => {
  try {
    await AdminNotificationModel.create(payload);
  } catch (err) {
    console.error("Failed to create admin notification:", err);
  }
};

/** Admin → single user push/in-app notification. `userId` is the account id from the users list. */
const sendNotificationToUser = async (payload: { userId: string; title: string; description: string }) => {
  const account = await AuthModel.findById(payload.userId).select("profile role").lean<{ profile: unknown; role: string }>();
  if (!account || !account.profile) throw new ApiError(404, "User not found");

  return NotificationHelper.createNotification({
    toId: String(account.profile),
    toModel: account.role,
    title: payload.title,
    description: payload.description,
    type: ENUM_NOTIFICATION_TYPE.ADMIN_MESSAGE,
  });
};

const getAdminNotifications = async (query: Record<string, unknown>) => {
  const filterQuery = { ...query };
  if (filterQuery.isSeen !== undefined) filterQuery.isSeen = filterQuery.isSeen === "true";

  const queryBuilder = new QueryBuilder(AdminNotificationModel.find(), filterQuery).filter().sort().paginate();
  const [data, meta, unreadCount] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
    AdminNotificationModel.countDocuments({ isSeen: false }),
  ]);
  return { meta, data: { notifications: data, unreadCount } };
};

const markAdminNotificationSeen = async (id: string) => {
  const notification = await AdminNotificationModel.findByIdAndUpdate(id, { $set: { isSeen: true } }, { new: true }).lean();
  if (!notification) throw new ApiError(404, "Notification not found");
  return notification;
};

const markAllAdminNotificationsSeen = async () => {
  const result = await AdminNotificationModel.updateMany({ isSeen: false }, { $set: { isSeen: true } });
  return { modifiedCount: result.modifiedCount, unreadCount: 0 };
};

const deleteAdminNotification = async (id: string) => {
  const deleted = await AdminNotificationModel.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, "Notification not found");
  return null;
};

const AdminNotificationService = {
  sendNotificationToUser,
  getAdminNotifications,
  markAdminNotificationSeen,
  markAllAdminNotificationsSeen,
  deleteAdminNotification,
};

export default AdminNotificationService;
