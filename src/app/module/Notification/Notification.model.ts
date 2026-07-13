import { model, models, Schema } from "mongoose";
import { INotification,IAdminNotification } from "./Notification.interface";
import { ENUM_NOTIFICATION_TYPE, ENUM_USER_Type } from "../../../utilities/enum";

// const NotificationSchema = new Schema<INotification>({
//     toId: { type: Schema.Types.ObjectId, required: true, ref: "Customer" },
//     title: { type: String, required: true },
//     // details: { type: String, required: true },
//     //route: { type: String, required: true },
//     isSeen: { type: Boolean, default: false },
// }, { timestamps: true });

const NotificationSchema = new Schema<INotification>({
    toId: { type: Schema.Types.ObjectId, required: true, refPath: "toModel" },
    toModel: {
        type: String,
        enum: Object.values(ENUM_USER_Type),
        required: true
    },
    title: { type: String, required: true },
    description: { type: String },
    type: {
        type: String,
        enum: Object.values(ENUM_NOTIFICATION_TYPE),
        required: true
    },

    referenceId: {
        type: Schema.Types.ObjectId
    },

    referenceModel: {
        type: String
    },

    metaData: {
        type: Object,
        default: {}
    },
    
    isSeen: { type: Boolean, default: false },
}, { timestamps: true });


const AdminNotificationSchema = new Schema<IAdminNotification>({
    title: { type: String, required: true },
    isSeen: { type: Boolean, default: false },
}, { timestamps: true });

const NotificationModel = models.Notification || model<INotification>("Notification", NotificationSchema);

const AdminNotificationModel = models.AdminNotification || model<IAdminNotification>("AdminNotification", AdminNotificationSchema);


export { NotificationModel, AdminNotificationModel}
