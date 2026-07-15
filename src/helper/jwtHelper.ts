import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import ApiError from '../error/ApiError';

//create token
export const createToken = (
  tokenPayload: object,
  secret: Secret,
  expireTime: SignOptions["expiresIn"]
) => {
  const token = jwt.sign(tokenPayload, secret, { expiresIn: expireTime });
  return token;
};

//verify token
export const verifyToken = (token: string, secret: Secret) => {
  // return jwt.verify(token, secret) as JwtPayload;
  try {

    return jwt.verify(token, secret) as JwtPayload;
    // return decoded;
  } catch (err: any) {

    if (err.name === "TokenExpiredError") {

      throw new ApiError(401, "Access token expired");
    }


    throw new ApiError(401, "Invalid token");
  }
};





