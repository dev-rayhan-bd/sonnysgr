
export interface IAdmin {
    name: string;
    email: string;
    phone?: string;
    contact?: string;
    address?: string;
    password: string;
    role: string;
    image?: string;
    verificationCode: string;
    isEmailVerified: boolean;
    isBlocked: boolean;
}