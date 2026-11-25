
export interface IAdmin {
    name: string;
    email: string;
    phone?: string;
    contact?: string;
    address?: string;
    password: string;
    role: string;
    image?: string;
    permissions?: string[];
    verificationCode: string;
    verificationCodeExpiresAt?: Date | null;
    isEmailVerified: boolean;
    isBlocked: boolean;
}