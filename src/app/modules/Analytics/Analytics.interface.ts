import { Types } from "mongoose";

export interface IAnalytics {
    retailerId: Types.ObjectId;
    profileViewCount: number;
    productViewCount: number;
}

export interface IAnalyticsReseller {
    resellerId: Types.ObjectId;
    profileViewCount: number;
    pairViewCount: number;
}