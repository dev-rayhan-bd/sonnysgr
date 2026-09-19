import { Types } from "mongoose";

export interface IReport {
    buyerId: Types.ObjectId;
    retailerId: Types.ObjectId;
    orderId: Types.ObjectId;
    title: string;
    content: string;
    resolution: string;
    images: string[];
    contactMethod: string;
    isUrgent: boolean;
    isSolved: boolean;
}