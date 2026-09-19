import { Types } from "mongoose";

export interface INotification {
    toId : Types.ObjectId;
    toModel: string;
    title :string;
    description: string;  
    type: string;
    referenceId?: Types.ObjectId;
    referenceModel?: string;
    metaData: {};
    isSeen: boolean;
}

export interface IAdminNotification {
    title :string;
    // details: string;  
    isSeen: boolean;
}

export type INotificationPayload = {
    toId?: string;   // optional field
    title: string;
};
