import { Types } from "mongoose";

export interface IAuth {
    profile: Types.ObjectId;
    refModel: string;
    email: string;
    name?: string;
    phone?: string;
    password: string;
    authProviders: {
        provider: string,
        providerId: string
    }[];
    role: string
    verificationCode: string;
    isEmailVerified: boolean;
    isResetPaswordEmailVerified: boolean;
    isProfileCompleted: boolean;
    isBlocked: boolean;
    status?: "Active" | "Warning" | "Banned" | "Deactivated" | "Suspended";
    statusReason?: string;
    statusUpdatedAt?: Date;
}

export type TRegisterUser = {
    name : string;
    email: string;
    password: string;
    confirmPassword: string;
    userType: string;
    shoeSize?: {};
    latitude?: number;
    longitude?: number;
}

export interface TLoginUser {
    email: string;
    password: string;
}

export interface IResetPassword {
    email: string;
    newPassword: string;
    confirmPassword: string;
}

export interface IChangePassword {
    currentPassword?: string;
    oldPassword?: string;
    newPassword: string;
    confirmPassword?: string;
}
