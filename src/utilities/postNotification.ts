import {NotificationModel,AdminNotificationModel} from "../app/modules/Notification/Notification.model";
import ApiError from "../error/ApiError";
import { IAdminNotification, INotification, INotificationPayload } from "../app/modules/Notification/Notification.interface";


export const postNotification = async (data: INotificationPayload) => {

  try {
    // let notification;
       await NotificationModel.create(data);

    // return notification;

  } catch (error: any) {
    console.error("Notification Error:", error);

    throw new ApiError(
      500,
      error instanceof Error
        ? error.message
        : "Notification creation failed"
    );
  }
};

export const postAdminNotification = async (data: IAdminNotification) => {

  try {
    // let notification;
       await AdminNotificationModel.create(data);

    // return notification;

  } catch (error: any) {
    console.error("Notification Error:", error);

    throw new ApiError(
      500,
      error instanceof Error
        ? error.message
        : "Notification creation failed"
    );
  }
};


// export default postNotification;