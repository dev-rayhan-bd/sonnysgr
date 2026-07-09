import express from "express";
import {auth} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import AuthValidations from "./auth.validation";
import AuthController from "./auth.controller";


const authRouter = express.Router();

//register
authRouter.post("/register-user",
    validateRequest(AuthValidations.registerUserValidationSchema) , 
    AuthController.registerUserWithEmailPassword
);

authRouter.post("/register-user-social-account",
    validateRequest(AuthValidations.registerSocialUserValidationSchema) , 
    AuthController.registerUserWithSocialAccount
);

//login
authRouter.post("/login-user",
    validateRequest(AuthValidations.loginValidationSchema)  ,
    AuthController.loginUserWithEmailPassword
);

authRouter.post("/login-user-social-account",
    validateRequest(AuthValidations.loginSocialUserValidationSchema)  ,
    AuthController.loginUserWithSocialAccount
);

//verify code
authRouter.post("/email-verify-code",
    validateRequest(AuthValidations.verifyCodeValidation)  ,
    AuthController.emailVerifyCode
);

authRouter.post("/reset-password-email-verify-code",
    validateRequest(AuthValidations.verifyCodeValidation)  ,
    AuthController.resetPasswordEmailVerifyCode
);


//send verify code
authRouter.post("/send-email-verify-code",
    validateRequest(AuthValidations.sendVerifyCodeValidation)  ,
    AuthController.sendEmailVerifyCode
);

authRouter.post("/send-reset-password-email-verify-code",
    validateRequest(AuthValidations.sendVerifyCodeValidation)  ,
    AuthController.sendResetPasswordEmailVerifyCode
);

authRouter.patch("/reset-password",
    validateRequest(AuthValidations.resetPasswordValidation)  ,
    AuthController.resetPassword
);


export default authRouter;