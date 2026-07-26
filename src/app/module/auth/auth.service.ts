import { profile } from "console";
import config from "../../../config";
import ApiError from "../../../error/ApiError";
import mongoose from "mongoose";
import { sendVerificationEmail } from "../../../helper/emailHelper";
import { createToken } from "../../../helper/jwtHelper";
import generateVerifyCode from "../../../utilities/codeGenerator";
import { IUser } from "../User/User.interface";
// import UserModel from "../User/User.model";
import { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import {
  IAuth,
  IResetPassword,
  TLoginUser,
  TRegisterUser,
} from "./auth.interface";
import { IJwtPayload } from "../../../interface/jwt.interface";
import AuthModel from "./auth.model";
import {
  ENUM_AUTH_PROVIDER_TYPE,
  ENUM_USER_Type,
} from "../../../utilities/enum";
import ResellerModel from "../Reseller/Reseller.model";
import RetailerModel from "../Retailer/Retailer.model";
import BuyerModel from "../Buyer/Buyer.model";
import { comparePassword, hashPassword } from "../../../helper/bcryptHelper";

//utility function to generate token
const generateLoginResponse = async (user: any) => {
  const tokenPayload: IJwtPayload = {
    authId: user?._id as string,
    email: user?.email,
    profileId: user?.profile as string,
    role: user?.role as string,
  };

  const accessToken = createToken(
    tokenPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  return {
    user: {
      email: user.email,
      role: user.role,
    },
    accessToken,
  };
};

//registration service
const registerWithEmailService = async (payload: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password, name, userType } = payload;
    // console.log("Payload received in service:", payload);

    let UserModel: any;
    //selected user type and create profile accordingly
    switch (userType) {
      case ENUM_USER_Type.BUYER:
        UserModel = BuyerModel;
        break;
      case ENUM_USER_Type.RESELLER:
        UserModel = ResellerModel;
        break;
      case ENUM_USER_Type.RETAILER:
        UserModel = RetailerModel;
        break;
      default:
        throw new ApiError(400, "Invalid user type");
    }
    // console.log("Selected UserModel:", UserModel.modelName);

    const emailExist = await AuthModel.exists({
      email: email.toLowerCase(),
    });

    if (emailExist) {
      throw new ApiError(400, `This email already exists. Please Login.`);
    }

    console.log("user exist", emailExist);

    // Generate verification code
    const { code, expiredAt } = generateVerifyCode(10);

    const hashedPassword = await hashPassword(password);

    const userDataPayload: any = {
      refModel: UserModel.modelName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userType,
      authProviders: [
        {
          provider: ENUM_AUTH_PROVIDER_TYPE.EMAIL,
          providerId: email.toLowerCase(),
        },
      ],
      verificationCode: code,
    };
    // console.log("User data payload prepared:", userDataPayload);

    // Create Auth user
    const user = await AuthModel.create([userDataPayload], { session });
    // console.log("Auth user created:", user);

    const createdUser = user[0];

    // Create Profile
    const profile = await UserModel.create(
      [
        {
          auth: createdUser._id,
          email: email.toLowerCase(),
          name,
          // shoeSize,
          // location: {
          //     coordinates: [Number(longitude), Number(latitude)]
          // }
        },
      ],
      { session },
    );
    // console.log("Profile created:", profile);

    const createdProfile = profile[0];

    // Update auth with profile id
    createdUser.profile = createdProfile._id;
    await createdUser.save({ session });

    // // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Send email AFTER commit
    // await sendVerificationEmail(email, {
    //     name: name,
    //     code: code,
    //     isResetPassword: false
    // });

    const newUser = {
      name: name,
      email: email,
    };

    return newUser;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
  // finally {
  //     // Commit transaction
  //     await session.commitTransaction();
  //     session.endSession();
  // }
};

const registerWithSocialService = async (payload: any) => {
  console.log("register social payload:", payload);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const email = payload?.email.toLowerCase();

    const existingUser = await AuthModel.findOne({
      email,
    }).session(session);

    console.log("esisting user", existingUser);

    /**
     * ------------------------------------
     * Existing Account
     * ------------------------------------
     */
    if (existingUser) {
      // console.log("entered here");

      const providerExists = existingUser.authProviders.some(
        (item: any) =>
          item?.provider === payload?.provider &&
          item?.providerId === payload?.providerId,
      );

      if (!providerExists) {
        existingUser.authProviders.push({
          provider: payload?.provider,
          providerId: payload?.providerId,
        });

        existingUser.isEmailVerified = true;

        await existingUser.save({ session });
      }

      await session.commitTransaction();

      // throw new ApiError(400,"User already registered. Please login.");

      return {
        status: 400,
        success: false,
        message: "User already registered. Please login.",
      };
    }

    /**
     * ------------------------------------
     * New Account
     * ------------------------------------
     */

    // const { email, password,name, userType, } = payload;
    // console.log("Payload received in service:", payload);

    let UserModel: any;
    //selected user type and create profile accordingly
    switch (payload?.userType) {
      case ENUM_USER_Type.BUYER:
        UserModel = BuyerModel;
        break;
      case ENUM_USER_Type.RESELLER:
        UserModel = ResellerModel;
        break;
      case ENUM_USER_Type.RETAILER:
        UserModel = RetailerModel;
        break;
      default:
        throw new ApiError(400, "Invalid user type");
    }
    // console.log("Selected UserModel:", UserModel.modelName);

    // Generate verification code
    const { code, expiredAt } = generateVerifyCode(10);

    const userDataPayload: any = {
      refModel: UserModel.modelName,
      email,
      // password,
      role: payload?.userType,
      authProviders: [
        {
          provider: payload?.provider,
          providerId: payload?.providerId,
        },
      ],
      verificationCode: code,
    };
    // console.log("User data payload prepared:", userDataPayload);

    // Create Auth user
    const user = await AuthModel.create([userDataPayload], { session });
    // console.log("Auth user created:", user);

    const createdUser = user[0];

    // Create Profile
    const profile = await UserModel.create(
      [
        {
          auth: createdUser._id,
          email: email,
          name: payload?.name,
          // shoeSize,
          // location: {
          //     coordinates: [Number(longitude), Number(latitude)]
          // }
        },
      ],
      { session },
    );
    // console.log("Profile created:", profile);

    const createdProfile = profile[0];

    // Update auth with profile id
    createdUser.profile = createdProfile._id;
    await createdUser.save({ session });

    // // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return generateLoginResponse(createdUser);
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
};

const registerUserService = async (payload: TRegisterUser) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password, name, userType, shoeSize, latitude, longitude } =
      payload;
    // console.log("Payload received in service:", payload);

    let UserModel: any;
    //selected user type and create profile accordingly
    switch (userType) {
      case ENUM_USER_Type.BUYER:
        UserModel = BuyerModel;
        break;
      case ENUM_USER_Type.RESELLER:
        UserModel = ResellerModel;
        break;
      case ENUM_USER_Type.RETAILER:
        UserModel = RetailerModel;
        break;
      default:
        throw new ApiError(400, "Invalid user type");
    }
    // console.log("Selected UserModel:", UserModel.modelName);

    const emailExist = await AuthModel.exists({
      email: email.toLowerCase(),
    });

    if (emailExist) {
      throw new ApiError(400, "This email already exists. Please Login.");
    }

    console.log("user exist", emailExist);

    // Generate verification code
    const { code, expiredAt } = generateVerifyCode(10);

    const userDataPayload: any = {
      refModel: UserModel.modelName,
      email: email.toLowerCase(),
      password,
      role: userType,
      authProviders: [
        {
          provider: ENUM_AUTH_PROVIDER_TYPE.EMAIL,
          providerId: email.toLowerCase(),
        },
      ],
      verificationCode: code,
    };
    // console.log("User data payload prepared:", userDataPayload);

    // Create Auth user
    const user = await AuthModel.create([userDataPayload], { session });
    // console.log("Auth user created:", user);

    const createdUser = user[0];

    // Create Profile
    const profile = await UserModel.create(
      [
        {
          auth: createdUser._id,
          email: email.toLowerCase(),
          name,
          // shoeSize,
          // location: {
          //     coordinates: [Number(longitude), Number(latitude)]
          // }
        },
      ],
      { session },
    );
    // console.log("Profile created:", profile);

    const createdProfile = profile[0];

    // Update auth with profile id
    createdUser.profile = createdProfile._id;
    await createdUser.save({ session });

    // // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Send email AFTER commit
    // await sendVerificationEmail(email, {
    //     name: name,
    //     code: code,
    //     isResetPassword: false
    // });

    const newUser = {
      name: name,
      email: email,
    };

    return newUser;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
  // finally {
  //     // Commit transaction
  //     await session.commitTransaction();
  //     session.endSession();
  // }
};

//login service

const loginWithSocialService = async (payload: any) => {
  // console.log("social login payload", payload);

  const user: any = await AuthModel.findOne({
    authProviders: {
      $elemMatch: {
        provider: payload?.provider,
        providerId: payload?.providerId,
      },
    },
  }).lean();

  if (!user) {
    throw new ApiError(404, "No account found.");
  }

  if (user?.isBlocked) {
    throw new ApiError(403, "This user is blocked.");
  }

  if (!user?.isProfileCompleted) {
    const tokenPayload: IJwtPayload = {
      authId: user?._id,
      email: user?.email,
      profileId: user?.profile,
      role: user?.role,
    };

    const accessToken = createToken(
      tokenPayload,
      config.jwt.secret as Secret,
      config.jwt.expires_in as SignOptions["expiresIn"],
    );

    return {
      statusCode: 302,
      isProfileCompleted: false,
      accessToken,
      msg: "Please complete profile.",
    };
  }

  return generateLoginResponse(user);
};

const loginWithEmailService = async (payload: {
  email: string;
  password: string;
}) => {
  const user: any = await AuthModel.findOne({
    email: payload.email.toLowerCase(),
  }).lean();

  if (!user) {
    throw new ApiError(404, "This user does not exist. Please sign up.");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "This user is blocked. Please contact admin.");
  }

  const hasEmailProvider = user.authProviders.some(
    (item: any) => item.provider === "email",
  );

  if (!hasEmailProvider) {
    throw new ApiError(
      400,
      `This account was registered with ${user?.authProviders?.[0]?.provider}. Please log in with ${user?.authProviders?.[0]?.provider} or set a password first.`,
    );
    //user?.authProviders[0].provider
  }

  if (!user.isEmailVerified) {
    return {
      statusCode: 403,
      isEmailVerified: false,
      msg: "Your email is not verified yet.",
    };
  }

  // if (payload.password !== user.password) {
  //     throw new ApiError(
  //         403,
  //         "Password does not match."
  //     );
  // }

  const checkPassword = await comparePassword(
    payload?.password,
    user?.password,
  );

  // console.log(checkPassword);

  if (!checkPassword) {
    throw new ApiError(403, "Password does not match.");
  }

  if (!user.isProfileCompleted) {
    const tokenPayload: IJwtPayload = {
      authId: user._id,
      email: user.email,
      profileId: user.profile,
      role: user.role,
    };

    const accessToken = createToken(
      tokenPayload,
      config.jwt.secret as Secret,
      config.jwt.expires_in as SignOptions["expiresIn"],
    );

    return {
      statusCode: 302,
      isProfileCompleted: false,
      accessToken,
      msg: "Please complete profile.",
    };
  }

  return generateLoginResponse(user);
};

const loginUserService = async (payload: TLoginUser) => {
  const { email, password } = payload;

  // Service logic goes here
  const user = await AuthModel.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "This user does not exist");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "This user is blocked");
  }

  //check whether user email is verified or not
  if (!user.isEmailVerified) {
    return {
      // expert: emailExist,
      statusCode: 403,
      isEmailVerified: false,
      msg: "Your email is not verified yet. Please verify your email.",
    };
  }

  // checking if the password is correct ----
  // if (user.password && !(await UserModel.isPaswordMatched(password, user.password))) {
  //     throw new ApiError(403, 'Password do not match');
  // }

  // if(!comparePassword(password,user.password)){
  //     throw new ApiError(403,'Password do not match');
  // }

  if (password !== user.password) {
    throw new ApiError(403, "Password do not match.");
  }

  //generate token
  const tokenPayload: IJwtPayload = {
    authId: user?._id as string,
    email: user?.email,
    profileId: user?.profile as string,
    role: user?.role as string,
  };

  const accessToken: string = createToken(
    tokenPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  const newUser: object = {
    // name: user?.name,
    email: user?.email,
    // phone: user?.phone,
    // role: user.role,
  };

  return { user: newUser, accessToken };
};

//verification code service

const emailVerifyCode = async (payload: {
  email: string;
  verifyCode: string;
}) => {
  const { email, verifyCode } = payload;

  const user = await AuthModel.findOne({ email: email }).select(
    "profile email role verificationCode isEmailVerified",
  );

  if (!user) {
    throw new ApiError(404, "User not found to verify otp.");
  }

  // if (user.codeExpireIn < new Date(Date.now())) {
  //     throw new AppError(httpStatus.BAD_REQUEST, 'Verify code is expired');
  // }

  if (verifyCode !== user.verificationCode) {
    throw new ApiError(400, "Code doesn't match");
  }

  // const result = await UserModel.findOneAndUpdate(
  //     { email: email },
  //     { isVerified: true },
  //     { new: true, runValidators: true }
  // );

  user.verificationCode = "";
  user.isEmailVerified = true;

  await user.save();

  // if (!result) {
  //     throw new AppError(
  //         httpStatus.SERVICE_UNAVAILABLE,
  //         'Server temporary unable please try again letter'
  //     );
  // }

  // Create JWT tokens
  const tokenPayload: IJwtPayload = {
    authId: user?._id,
    email: user?.email,
    profileId: user?.profile,
    role: user?.role,
  };

  const accessToken: string = createToken(
    tokenPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  // const refreshToken = createToken(
  //     jwtPayload,
  //     config.jwt_refresh_secret as string,
  //     config.jwt_refresh_expires_in as string
  // );

  return { user, accessToken };
};

const resetPasswordEmailVerifyCode = async (payload: {
  email: string;
  verifyCode: string;
}) => {
  const { email, verifyCode } = payload;

  const user = await AuthModel.findOne({ email: email }).select(
    "profile email role verificationCode isEmailVerified isResetPaswordEmailVerified",
  );

  if (!user) {
    throw new ApiError(404, "User not found to verify otp.");
  }

  // if (user.codeExpireIn < new Date(Date.now())) {
  //     throw new AppError(httpStatus.BAD_REQUEST, 'Verify code is expired');
  // }

  if (verifyCode !== user.verificationCode) {
    throw new ApiError(400, "Code doesn't match");
  }

  // const result = await UserModel.findOneAndUpdate(
  //     { email: email },
  //     { isVerified: true },
  //     { new: true, runValidators: true }
  // );

  user.verificationCode = "";
  user.isResetPaswordEmailVerified = true;

  await user.save();

  // if (!result) {
  //     throw new AppError(
  //         httpStatus.SERVICE_UNAVAILABLE,
  //         'Server temporary unable please try again letter'
  //     );
  // }

  // Create JWT tokens
  const tokenPayload: IJwtPayload = {
    authId: user?._id,
    email: user?.email,
    profileId: user?.profile,
    role: user?.role,
  };

  const accessToken: string = createToken(
    tokenPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  // const refreshToken = createToken(
  //     jwtPayload,
  //     config.jwt_refresh_secret as string,
  //     config.jwt_refresh_expires_in as string
  // );

  return { user, accessToken };
};

//send email verification code service
const sendEmailVerifyCodeService = async (payload: { email: string }) => {
  const { email } = payload;

  const user = await AuthModel.findOne({ email: email }).populate({
    path: "profile",
    select: "name",
  });

  if (!user) {
    throw new ApiError(404, "User not found to send otp");
  }

  const { code, expiredAt } = generateVerifyCode(10);

  user.verificationCode = code;

  await user.save();

  await sendVerificationEmail(email, {
    name: user?.profile?.name || "User",
    code: code,
    isResetPassword: false,
  });

  return null;
};

const sendResetEmailVerifyCodeService = async (payload: { email: string }) => {
  const { email } = payload;

  const user = await AuthModel.findOne({ email: email }).populate({
    path: "profile",
    select: "name",
  });

  if (!user) {
    throw new ApiError(404, "User not found to send otp");
  }

  const { code, expiredAt } = generateVerifyCode(10);

  user.verificationCode = code;

  await user.save();

  await sendVerificationEmail(email, {
    name: user?.profile?.name || "User",
    code: code,
    isResetPassword: true,
  });

  return null;
};

// reset password
const resetPasswordService = async (payload: IResetPassword) => {
  const { email, newPassword } = payload;

  const user = await AuthModel.findOne({ email: email });

  if (!user) {
    throw new ApiError(404, "This user does not exist to reset password");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "This user is blocked. Cannot reset password");
  }

  if (!user.isResetPaswordEmailVerified) {
    throw new ApiError(
      403,
      "You still haven't verified the otp to reset password. ",
    );
  }

  //hash new password
  // const newHashedPassword = await bcrypt.hash(
  //     payload.password,
  //     Number(config.bcrypt_salt_rounds)
  // );

  // user.password = newPassword;
  user.password = await hashPassword(newPassword);
  user.isResetPaswordEmailVerified = false;
  await user.save();

  //generate new token after password reset
  const tokenPayload: IJwtPayload = {
    authId: user?._id as string,
    email: user?.email,
    // profileId: user?.name,
    profileId: user?.profile as string,
    role: user?.role as string,
  };

  const accessToken: string = createToken(
    tokenPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  // const refreshToken = createToken(
  //     jwtPayload,
  //     config.jwt_refresh_secret as string,
  //     config.jwt_refresh_expires_in as string
  // );

  return { user: { name: user.name, email: user.email }, accessToken };
};

const getMyProfileService = async (userDetails: JwtPayload) => {
  const { authId } = userDetails;

  const user = await AuthModel.findById(authId).select("-password").populate("profile");
  if (!user) {
    throw new ApiError(404, "User profile not found");
  }

  return user;
};

const updateMyProfileService = async (
  userDetails: JwtPayload,
  payload: any,
  imagePath?: string
) => {
  const { authId, role } = userDetails;

  const authUser = await AuthModel.findById(authId);
  if (!authUser) {
    throw new ApiError(404, "User not found");
  }

  let ProfileModel: any;
  switch (role) {
    case ENUM_USER_Type.BUYER:
      ProfileModel = BuyerModel;
      break;
    case ENUM_USER_Type.RESELLER:
      ProfileModel = ResellerModel;
      break;
    case ENUM_USER_Type.RETAILER:
      ProfileModel = RetailerModel;
      break;
    default:
      throw new ApiError(400, "Invalid user role");
  }

  const updateData: any = { ...payload };
  if (imagePath) {
    updateData.image = imagePath;
  }

  const updatedProfile = await ProfileModel.findByIdAndUpdate(
    authUser.profile,
    { $set: updateData },
    { new: true }
  );

  if (!updatedProfile) {
    throw new ApiError(404, "Profile not found to update");
  }

  if (!authUser.isProfileCompleted) {
    authUser.isProfileCompleted = true;
    await authUser.save();
  }

  const updatedUser = await AuthModel.findById(authId)
    .select("-password")
    .populate("profile");

  return updatedUser;
};

const AuthServices = {
  registerWithEmailService,
  registerWithSocialService,

  loginWithEmailService,
  loginWithSocialService,

  emailVerifyCode,
  resetPasswordEmailVerifyCode,

  sendEmailVerifyCodeService,
  sendResetEmailVerifyCodeService,

  resetPasswordService,

  getMyProfileService,
  updateMyProfileService,
};
export default AuthServices;
