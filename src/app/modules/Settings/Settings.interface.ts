import { Types } from "mongoose";

export interface ISettings {
    // id: string;
    description: string;
}

export interface IFaq{
    question: string;
    answer: string;
}

export interface IHelpAndSupport {
    buyerId: Types.ObjectId;
    orderId: Types.ObjectId;
    type: string;
    images: string[];
    content: string;
    status: string;
    isUrgent: boolean;
    createdAt: Date;
}

export interface IReport {
    buyerId: Types.ObjectId;
    productId: Types.ObjectId;
    type: string;
    images: string[];
    content: string;
    contactMethod: string;
    isUrgent: boolean;
    createdAt: Date;
}