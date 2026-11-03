import { register } from "module";
import {
  verifyAppleToken,
  verifyGoogleToken,
} from "../../../helper/authProvider";
import catchAsync from "../../../utilities/catchasync";
import { ENUM_AUTH_PROVIDER_TYPE } from "../../../utilities/enum";
import sendResponse from "../../../utilities/sendResponse";
import authServices from "./auth.service";
import { AuthRequest } from "../../../interface/authRequest";
import { StatusCodes } from "http-status-codes";

// const registerUser = catchAsync(async (req, res) => {

//     const result = await authServices.registerUserService(req.body);

//     sendResponse(res, {
//         statusCode: 201,
//         success: true,
//         message: "user registered successfully. Check your email for verification code.",
//         data: result,
//     });
// });

// const loginUser = catchAsync(async (req, res) => {

//     const result:any = await authServices.loginUserService(req.body);

//     sendResponse(res, {
//         statusCode: result?.statusCode ? result?.statusCode : 200,
//         success: true,
//         message: result?.msg ? result?.msg : "user logged In successfully.",
//         data: result,
//     });
// });

const registerUserWithEmailPassword = catchAsync(async (req, res) => {
  const result = await authServices.registerWithEmailService(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "user registered successfully. Verify your email.",
    data: result,
  });
});

const registerUserWithSocialAccount = catchAsync(async (req, res) => {
  // let result;

  const { provider, authToken, userType } = req?.body;

  console.log("register social sign up in body:", req?.body);

  // if (provider === ENUM_AUTH_PROVIDER.GOOGLE || provider === ENUM_AUTH_PROVIDER.APPLE) {

  let authDataPayload: any = {};

  if (provider === ENUM_AUTH_PROVIDER_TYPE.GOOGLE) {
    authDataPayload = await verifyGoogleToken(authToken);
  } else if (provider === ENUM_AUTH_PROVIDER_TYPE.APPLE) {
    authDataPayload = await verifyAppleToken(authToken);
  }

  // console.log("register auth data payload:",authDataPayload);

  const result: any = await authServices.registerWithSocialService({
    userType,
    provider,
    providerId: authDataPayload?.sub,
    ...authDataPayload,
  });

  // } else {

  //     result = await authServices.registerWithEmailService(req.body);
  // }

  sendResponse(res, {
    success: !result?.success ? result?.success : true,
    statusCode: result?.status ? result?.status : 200,
    message: result?.message ? result?.message : "Registration successful",
    data: result,
  });
});

//log in
const loginUserWithEmailPassword = catchAsync(async (req, res) => {
  const result: any = await authServices.loginWithEmailService(req.body);

  sendResponse(res, {
    statusCode: result.statusCode ? result.statusCode : 200,
    success: true,
    message: result?.msg ? result?.msg : "user logged In successfully.",
    data: result,
  });
});

const loginUserWithSocialAccount = catchAsync(async (req, res) => {
  // let result;

  const { provider, authToken } = req?.body;

  // console.log("Login body:", req.body);

  // if (provider === ENUM_AUTH_PROVIDER.GOOGLE || provider === ENUM_AUTH_PROVIDER.APPLE) {

  let authDataPayload: any = {};

  if (provider === ENUM_AUTH_PROVIDER_TYPE.GOOGLE) {
    authDataPayload = await verifyGoogleToken(authToken);
  } else if (provider === ENUM_AUTH_PROVIDER_TYPE.APPLE) {
    authDataPayload = await verifyAppleToken(authToken);
  }

  const result = await authServices.loginWithSocialService({
    provider,
    providerId: authDataPayload?.sub,
    ...authDataPayload,
  });

  // } else {

  //     result = await authServices.loginWithEmailService(req.body);
  // }

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Login successful",
    data: result,
  });
});
//verify code

const emailVerifyCode = catchAsync(async (req, res) => {
  const result = await authServices.emailVerifyCode(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Email verified successfully.",
    data: result,
  });
});

const resetPasswordEmailVerifyCode = catchAsync(async (req, res) => {
  const result = await authServices.resetPasswordEmailVerifyCode(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Email verified successfully to reset password.",
    data: result,
  });
});

//send verify code

const sendEmailVerifyCode = catchAsync(async (req, res) => {
  const result = await authServices.sendEmailVerifyCodeService(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "To verify your email, code sent successfully.",
    data: result,
  });
});

const sendResetPasswordEmailVerifyCode = catchAsync(async (req, res) => {
  const result = await authServices.sendResetEmailVerifyCodeService(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Verification code sent successfully.",
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await authServices.resetPasswordService(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset successfully.",
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await authServices.changePasswordService(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password changed successfully.",
    data: result,
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await authServices.getMyProfileService(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile fetched successfully.",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  let imagePath: string | undefined;

  if (req.file) {
    imagePath = `uploads/profile-image/${req.file.filename}`;
  }

  const result = await authServices.updateMyProfileService(user, req.body, imagePath);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile updated successfully.",
    data: result,
  });
});

const AuthController = {
  registerUserWithEmailPassword,
  registerUserWithSocialAccount,

  loginUserWithEmailPassword,
  loginUserWithSocialAccount,

  emailVerifyCode,
  resetPasswordEmailVerifyCode,

  sendEmailVerifyCode,
  sendResetPasswordEmailVerifyCode,

  resetPassword,
  changePassword,

  getMyProfile,
  updateMyProfile,
};
export default AuthController;
