import { NextFunction, Request, Response } from 'express';
import catchAsync from '../../utilities/catchasync';
import ApiError from '../../error/ApiError';
import jwt,{ JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../config';
// import { TUserRole } from '../modules/user/user.interface';
import  UserModel  from '../module/User/User.model';
// import { USER_ROLE } from '../modules/user/user.constant';
// import SuperAdmin from '../modules/superAdmin/superAdmin.model';
import { verifyToken } from '../../helper/jwtHelper';
// import { ENUM_USER_ROLE } from '../../utilities/enum';
import { AuthRequest } from '../../interface/authRequest';
import { Socket } from 'socket.io';
import { IJwtPayload } from '../../interface/jwt.interface';

export const auth =
  (roles: string[], isAccessible = true) => async (req: Request, res: Response, next: NextFunction) => {

    const tokenWithBearer = req.headers.authorization;
    
    if (!tokenWithBearer && !isAccessible) return next();
    
    if (!tokenWithBearer){

      throw new ApiError(401,"You are not authorized for this role");
    }
    
    try {

      if (!tokenWithBearer.startsWith("Bearer ")) {
        throw new ApiError(401, "Invalid token format. Bearer token required.");
      }

      const token = tokenWithBearer.split(" ")[1];
      // let decoded;

          // try {
          //     decoded = jwt.verify(
          //         token,
          //         config.jwt.secret as string
          //     ) as JwtPayload;
          // } catch (err) {
          //     throw new ApiError(401, 'Token is expired');
          // }

      const decoded = verifyToken(token, config.jwt.secret as Secret);
      if(!decoded){
        throw new ApiError(404,"No user found after jwt verification.");
      }


      (req as AuthRequest).user = decoded as IJwtPayload;
      // (req as AuthRequest).user = {
      //   userId: decoded.userId,
      //   profileId: decoded.profileId,
      //   role: decoded.role,
      //   email: decoded.email,
      // };
      // console.log(decoded);

      // const isExist = await userModel.findById(decoded?.userId);

      // if (!Object.values(ENUM_USER_ROLE).includes(decoded.role) ) {

      //   throw new ApiError(401, "You are not authorized");
      // }

      // console.log(roles.length);

      if (roles.length && !roles.includes(decoded.role)){

        throw new ApiError(403,"Access Forbidden: You do not have permission to perform this action");
      }

      next();
    } catch (error) {
      next(error);
    }
  };


export const authorizeUser = async (req: Request, res: Response, next: NextFunction) => {

    const tokenWithBearer = req.headers.authorization;
    
    // if (!tokenWithBearer && !isAccessible) return next();
    
    if (!tokenWithBearer){

      throw new ApiError(401,"You are not authorized to perform this action.");
    }
    
    try {

      if (!tokenWithBearer.startsWith("Bearer ")) {
        throw new ApiError(401, "Invalid token format. Bearer token required.");
      }

      const token = tokenWithBearer.split(" ")[1];

      const decoded = verifyToken(token, config.jwt.secret as Secret);
      if(!decoded){
        throw new ApiError(404,"No user found after jwt verification.");
      }


      (req as AuthRequest).user = decoded as IJwtPayload;

      next();
    } catch (error) {
      next(error);
    }
  };


  export const socketAuthMiddleware = (socket: Socket, next: any) => {
  try {

    // let token =
    //   socket.handshake.auth?.token ||
    //   socket.handshake.headers?.authorization?.split(" ")[1];
    let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

    if (!token) {
      return next(new Error("Unauthorized: No token"));
    }

    // ✅ handle "Bearer <token>" OR raw token
    // if (token.startsWith("Bearer ")) {
    //   token = token.split(" ")[1];
    // }

    const decoded = jwt.verify(token, config.jwt.secret as Secret);

    // attach user to socket
    socket.data.user = decoded;

    next();

  } catch (error) {
    next(new Error("Unauthorized: Invalid token"));
  }
};

  
 
