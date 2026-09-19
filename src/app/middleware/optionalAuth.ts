import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config';

const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret as Secret) as JwtPayload;
      (req as any).user = decoded;
    } catch {
      // Token invalid or expired — silently continue
    }
  }
  next();
};

export default optionalAuth;
