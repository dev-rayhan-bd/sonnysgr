import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import { Socket } from 'socket.io';

export const auth = (
  rolesOrFirstRole?: string[] | string,
  isAccessibleOrSecondRole: boolean | string = true,
  ...restRoles: string[]
) => {
  let requiredRoles: string[] = [];
  let isAccessible = true;

  if (Array.isArray(rolesOrFirstRole)) {
    requiredRoles = rolesOrFirstRole;
    if (typeof isAccessibleOrSecondRole === 'boolean') {
      isAccessible = isAccessibleOrSecondRole;
    }
  } else if (typeof rolesOrFirstRole === 'string') {
    requiredRoles = [rolesOrFirstRole];
    if (typeof isAccessibleOrSecondRole === 'string') {
      requiredRoles.push(isAccessibleOrSecondRole, ...restRoles);
    }
  }

  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // If token missing and route is marked as accessible optionally
    if (!authHeader && !isAccessible) {
      return next();
    }

    if (!authHeader) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token format. Bearer token required.');
    }

    const token = authHeader.split(' ')[1];

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret as Secret) as JwtPayload;
    } catch (err: any) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Token is expired or invalid');
    }

    if (!decoded) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found after token verification');
    }

    const userRole = decoded.role || (decoded as any).userType;

    if (requiredRoles.length && !requiredRoles.includes(userRole)) {
      throw new AppError(httpStatus.FORBIDDEN, 'Access Forbidden: You do not have permission to perform this action');
    }

    (req as any).user = decoded;
    next();
  });
};

export const authorizeUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized to perform this action.');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token format. Bearer token required.');
  }

  const token = authHeader.split(' ')[1];

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.jwt.secret as Secret) as JwtPayload;
  } catch (err: any) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Token is expired or invalid');
  }

  (req as any).user = decoded;
  next();
});

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  try {
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization;

    if (!token) {
      return next(new Error('Unauthorized: No token provided'));
    }

    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    const decoded = jwt.verify(token, config.jwt.secret as Secret);
    socket.data.user = decoded;
    next();
  } catch (error) {
    next(new Error('Unauthorized: Invalid token'));
  }
};

export default auth;
