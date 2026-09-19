import { JwtPayload } from "jsonwebtoken";
import ApiError from "../../../error/ApiError";
import { INotification } from "./Notification.interface";
import {AdminNotificationModel, NotificationModel} from "./Notification.model";

const getAllNotificationService = async (userDetails: JwtPayload,query: Record<string, unknown>) => {

    const {profileId} = userDetails;

    let {page, limit} = query;

    page = parseInt(page as any) || 1;
    limit = parseInt(limit as any) || 10;
    let skip = (page as number - 1) * (limit as number);

    const [notifications, totalNotifications] = await Promise.all([

        NotificationModel.find({toId: profileId})
                    .sort({createdAt: -1})
                        .skip(skip).limit(limit as number)
                           .lean(),
    
        NotificationModel.countDocuments({toId: profileId})
    ])

    const totalPage = Math.ceil(totalNotifications / (limit as number));

    const hasNextPage = (page as number) < totalPage ? true : false;

    return {
        meta:{
            page,
            limit,
            total: totalNotifications, 
            totalPage,
            hasNextPage
        },
        notifications,
        notificationCount: notifications.length
    };

    // const allNotification = await NotificationModel.find({toId: profileId}).sort({createdAt: -1}).lean();

    // return allNotification;
    
};


const deleteNotification = async (id: string) => {
    
    const deletedNotification = await NotificationModel.findByIdAndDelete(id);

    if(!deletedNotification){
        throw new ApiError(500,"Failed to delete notification");
    }
    return deletedNotification;
    
};

//dashboard

const deleteAdminNotification = async (id: string) => {
    
    const deletedNotification = await AdminNotificationModel.findByIdAndDelete(id);

    if(!deletedNotification){
        throw new ApiError(500,"Failed to delete notification");
    }
    return deletedNotification;
    
};

const getAllAdminNotificationService = async () => {

    const allNotification = await AdminNotificationModel.find({}).sort({createdAt: -1}).lean();

    return allNotification;
    
};

const makeNotificationSeen = async (id: string) => {

    const updatedNotification = await NotificationModel.findByIdAndUpdate(id,{isSeen: true},{new:true});

    if(!updatedNotification){
        throw new ApiError(500,"Failed to update notification status.");
    }
    
    return updatedNotification;
    
}

const makeAdminNotificationSeen = async (id: string) => {

    const updatedNotification = await AdminNotificationModel.findByIdAndUpdate(id,{isSeen: true},{new:true});

    if(!updatedNotification){
        throw new ApiError(500,"Failed to update notification status");
    }
    return updatedNotification;
    
}


const NotificationServices = { 
    getAllNotificationService, 
    getAllAdminNotificationService ,
    deleteAdminNotification,
    deleteNotification,
    makeNotificationSeen,
    makeAdminNotificationSeen
};
export default NotificationServices;