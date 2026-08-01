// src/app/interfaces/authRequest.ts
import { Request } from 'express';

export interface AuthRequest extends Request {
  user: {
    authId: string;
    email: string;
    profileId: string;
    role: string;
    status: string;
  };
}
