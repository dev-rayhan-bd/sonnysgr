import bcrypt from 'bcrypt';
import config from '../config';


export const hashPassword = async (password: string): Promise<string> => {
    const hashedPassword = await bcrypt.hash(password,  Number(config.bcrypt.salt_round || 10));
    return hashedPassword;
}

export const comparePassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
}