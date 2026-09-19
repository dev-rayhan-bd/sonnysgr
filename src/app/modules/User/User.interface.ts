import { Types } from "mongoose";

export interface IUser {
  auth: Types.ObjectId;
  couple: Types.ObjectId;
  partner: Types.ObjectId;
  status: string;
  email: string;
  name: string;
  city: string;
  image: string;
  desireMood?: {
    imoji: string;
    mood: string
  };
  firstMeet: Date;
  nextMeet: Date;
  importantDays: Object[];
  isLongDistance: boolean;
  isConnected: boolean;
  subscription: {
    isSubscribed: boolean;
    subscrptionId: Types.ObjectId;
    subscrptionName: string;
    subscribedAt: Date;
    expiredAt: Date;
  };

}





export interface IChangePassword {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    oldPassword: string
}

export type TaddDate = {
    label: string;
    image: string;
    date: Date;
}