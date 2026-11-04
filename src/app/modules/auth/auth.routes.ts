import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import AuthValidations from "./auth.validation";
import AuthController from "./auth.controller";
import { uploadProfile } from "../../middleware/multerMiddleware";

const authRouter = express.Router();

//register
authRouter.post(
  "/register-user",
  validateRequest(AuthValidations.registerUserValidationSchema),
  AuthController.registerUserWithEmailPassword,
);

authRouter.post(
  "/register-user-social-account",
  validateRequest(AuthValidations.registerSocialUserValidationSchema),
  AuthController.registerUserWithSocialAccount,
);

//login
authRouter.post(
  "/login-user",
  validateRequest(AuthValidations.loginValidationSchema),
  AuthController.loginUserWithEmailPassword,
);

authRouter.post(
  "/login-user-social-account",
  validateRequest(AuthValidations.loginSocialUserValidationSchema),
  AuthController.loginUserWithSocialAccount,
);

//verify code
authRouter.post(
  "/email-verify-code",
  validateRequest(AuthValidations.verifyCodeValidation),
  AuthController.emailVerifyCode,
);

authRouter.post(
  "/reset-password-email-verify-code",
  validateRequest(AuthValidations.verifyCodeValidation),
  AuthController.resetPasswordEmailVerifyCode,
);

//send verify code
authRouter.post(
  "/send-email-verify-code",
  validateRequest(AuthValidations.sendVerifyCodeValidation),
  AuthController.sendEmailVerifyCode,
);

authRouter.post(
  "/send-reset-password-email-verify-code",
  validateRequest(AuthValidations.sendVerifyCodeValidation),
  AuthController.sendResetPasswordEmailVerifyCode,
);

authRouter.patch(
  "/reset-password",
  validateRequest(AuthValidations.resetPasswordValidation),
  AuthController.resetPassword,
);

authRouter.patch(
  "/change-password",
  authorizeUser,
  validateRequest(AuthValidations.changePasswordValidationSchema),
  AuthController.changePassword,
);

authRouter.get("/get-my-profile", authorizeUser, AuthController.getMyProfile);

authRouter.patch(
  "/update-profile",
  authorizeUser,
  uploadProfile.single("image"),
  AuthController.updateMyProfile
);

export default authRouter;
