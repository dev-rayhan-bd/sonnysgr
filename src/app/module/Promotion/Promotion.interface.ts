import { Types } from "mongoose";

export interface IPromotion {
    retailerID: Types.ObjectId;
    type: string;
    image: string;
    title: string;
    content: string;
    recepient: string;
    sendMethod: string;
    status: string;
    scheduledAt: Date;
    startAt: Date;
    expiresAt: Date;
    duration: number; //hours
    isActive: boolean;
    createdAt: Date;
}