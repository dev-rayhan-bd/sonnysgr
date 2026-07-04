import { profile } from "console";
import config from "../../../config";
import ApiError from "../../../error/ApiError";
import mongoose from "mongoose";
import { sendVerificationEmail } from "../../../helper/emailHelper";
import { createToken } from "../../../helper/jwtHelper";
import generateVerifyCode from "../../../utilities/codeGenerator";
import { IUser } from "../User/User.interface";
// import UserModel from "../User/User.model";
import { JwtPayload, Secret,SignOptions } from "jsonwebtoken";
import { IAuth, IResetPassword, TLoginUser, TRegisterUser } from "./auth.interface";
import { IJwtPayload } from "../../../interface/jwt.interface";
import AuthModel from "./auth.model";
import { ENUM_AUTH_PROVIDER_TYPE, ENUM_USER_Type } from "../../../utilities/enum";
import ResellerModel from "../Reseller/Reseller.model";
import RetailerModel from "../Retailer/Retailer.model";
import BuyerModel from "../Buyer/Buyer.model";




const registerUserService = async (payload: TRegisterUser) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const { email, password,name, userType, shoeSize, latitude, longitude } = payload;
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
            email: email.toLowerCase()
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
            authProviders:[{
                provider: ENUM_AUTH_PROVIDER_TYPE.EMAIL,
                providerId: email.toLowerCase()
            }] ,
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
            { session }
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
        await sendVerificationEmail(email, {
            name: name,
            code: code,
            isResetPassword: false
        });

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

}

const loginUserService = async (payload: TLoginUser) => {

     const {email,password} = payload;

    // Service logic goes here
    const user = await AuthModel.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new ApiError(404, 'This user does not exist');
    }
    
    if (user.isBlocked) {
        throw new ApiError(403, 'This user is blocked');
    }

    //check whether user email is verified or not
    if(!user.isEmailVerified){
        
        return { 
            // expert: emailExist,
            statusCode: 403 ,
            isEmailVerified: false,
            msg: "Your email is not verified yet. Please verify your email.",
        }
            
    }

    // checking if the password is correct ----
    // if (user.password && !(await UserModel.isPaswordMatched(password, user.password))) {
    //     throw new ApiError(403, 'Password do not match');
    // }

    // if(!comparePassword(password,user.password)){
    //     throw new ApiError(403,'Password do not match');
    // }

    if(password !== user.password){
        throw new ApiError(403,'Password do not match.');
    }

    //generate token
    const tokenPayload: IJwtPayload = {
        authId: user?._id as string,
        email: user?.email,
        profileId: user.profile as string
    };

    const accessToken: string =  createToken(
        tokenPayload,
        config.jwt.secret as Secret,
        config.jwt.expires_in as SignOptions["expiresIn"]
    );


    const newUser : object = {
        // name: user?.name,
        email: user?.email,
        // phone: user?.phone,
        // role: user.role,
        
    }

    return {user: newUser,accessToken};
}

const verifyCode = async (payload:{email: string, verifyCode: string}) => {
    const { email, verifyCode } = payload;

    const user = await AuthModel.findOne({ email: email }).select("profile email role verificationCode isEmailVerified");

    if (!user) {
        throw new ApiError(404, 'User not found to verify otp.');
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

    user.verificationCode = '';
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
        profileId: user?.profile
    };

    const accessToken: string =  createToken(
            tokenPayload,
            config.jwt.secret as Secret,
            config.jwt.expires_in as SignOptions["expiresIn"]
        );

    // const refreshToken = createToken(
    //     jwtPayload,
    //     config.jwt_refresh_secret as string,
    //     config.jwt_refresh_expires_in as string
    // );

    return  {user,accessToken};
};

const sendVerifyCodeService = async (payload:{email: string}) => {
    const { email } = payload;

    const user = await AuthModel.findOne({ email: email });

    if (!user) {
        throw new ApiError(404, 'User not found to send otp');
    }

    const {code, expiredAt} = generateVerifyCode(10);

    
    user.verificationCode = code;

    await user.save();

    await sendVerificationEmail(email,{
        name: user.name,
        code: code,
        isResetPassword: true
    });

    return null;
}

// reset password
const resetPasswordService = async (payload: IResetPassword) => {
    const { email, newPassword } = payload;

    const user = await AuthModel.findOne({ email: email });

    if (!user) {
        throw new ApiError(404, 'This user does not exist to reset password');
    }

    if (user.isBlocked) {
        throw new ApiError(403, 'This user is blocked. Cannot reset password');
    }

    //hash new password
    // const newHashedPassword = await bcrypt.hash(
    //     payload.password,
    //     Number(config.bcrypt_salt_rounds)
    // );

    user.password = newPassword;
    await user.save();

    //generate new token after password reset
    const tokenPayload: IJwtPayload = {
        authId: user?._id as string,
        email: user?.email,
        profileId: user?.name
    };

    const accessToken: string =  createToken(
        tokenPayload,
        config.jwt.secret as Secret,
        config.jwt.expires_in as SignOptions["expiresIn"]
    );

    // const refreshToken = createToken(
    //     jwtPayload,
    //     config.jwt_refresh_secret as string,
    //     config.jwt_refresh_expires_in as string
    // );

    return {user:{name:user.name,email:user.email}, accessToken };
};



const AuthServices = { 
    registerUserService,
    loginUserService,
    verifyCode,
    sendVerifyCodeService,
    resetPasswordService
};
export default AuthServices;