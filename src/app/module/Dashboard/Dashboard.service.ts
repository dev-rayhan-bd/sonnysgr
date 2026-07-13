import ApiError from "../../../error/ApiError";
import { TLoginUser } from "../auth/auth.interface";
import AdminModel from "./Admin.model";
import { IAdmin } from "./Dashboard.interface";
import config from "../../../config";
import { JwtPayload,Secret, SignOptions } from "jsonwebtoken";
import { createToken } from "../../../helper/jwtHelper";
import { IChangePassword } from "../User/User.interface";
import generateVerifyCode from "../../../utilities/codeGenerator";
import { sendVerificationEmail } from "../../../helper/emailHelper";
import deleteOldFile from "../../../utilities/deleteFile";
import UserModel from "../User/User.model";
// import PostModel from "../Post/Post.model";
// import { ENUM_POST_STATUS } from "../../../utilities/enum";



const registerAdminService = async (payload: IAdmin) => {
    const {name, email,password,role} = payload;

    const admin = await AdminModel.create({
        name: name,
        email: email.toLowerCase(),
        password: password,
        role: role
    });

    if(!admin){
        throw new ApiError(500,"Failed to create new Admin");
    }

    return {
        name: admin.name,
        email: admin.email,
        // phone: admin.phone,
        role: admin.role
    }
}

const loginAdminService = async (payload: TLoginUser) => {

    const {email,password} = payload;

    // Service logic goes here
    const admin = await AdminModel.findOne({ email: email });

    if (!admin) {
        throw new ApiError(404, 'This admin does not exist');
    }
    
    if (admin.isBlocked) {
        throw new ApiError(403, 'This admin is blocked');
    }
    // if (!user.isVerified) {
    //     throw new ApiError(
    //         403,
    //         'You are not verified user . Please verify your email'
    //     );
    // }

    // checking if the password is correct ----
    // if (user.password && !(await UserModel.isPaswordMatched(password, user.password))) {
    //     throw new ApiError(403, 'Password do not match');
    // }

    // if(!comparePassword(password,user.password)){
    //     throw new ApiError(403,'Password do not match');
    // }

    if(password !== admin.password){
        throw new ApiError(403,'Password do not match');
    }


    //generate token
    const tokenPayload = {
        userId: admin?._id as string,
        role: admin?.role,
        email: admin?.email
    };

    const accessToken: string =  createToken(
        tokenPayload,
        config.jwt.secret as Secret,
        config.jwt.expires_in as SignOptions["expiresIn"]
    );


    const newUser : object = {
        name: admin?.name,
        email: admin?.email,
        phone: admin?.phone,
        role: admin.role,
        
    }

    return { newUser,accessToken};
}

const adminVerifyCode = async (payload:{email: string, verifyCode: string}) => {
    const { email, verifyCode } = payload;

    const admin = await AdminModel.findOne({ email: email }).select("profile email role verificationCode isEmailVerified");

    if (!admin) {
        throw new ApiError(404, 'Admin not found to verify otp');
    }

    // if (user.codeExpireIn < new Date(Date.now())) {
    //     throw new AppError(httpStatus.BAD_REQUEST, 'Verify code is expired');
    // }

    if (verifyCode !== admin.verificationCode) {
        throw new ApiError(400, "Code doesn't match");
    }

    // const result = await UserModel.findOneAndUpdate(
    //     { email: email },
    //     { isVerified: true },
    //     { new: true, runValidators: true }
    // );

    admin.verificationCode = '';
    admin.isEmailVerified = true;
    await admin.save();

    

    // if (!result) {
    //     throw new AppError(
    //         httpStatus.SERVICE_UNAVAILABLE,
    //         'Server temporary unable please try again letter'
    //     );
    // }

    // Create JWT tokens
    // const tokenPayload = {
    //     userId: user?._id,
    //     profileId: user?.profile,
    //     email: user?.email,
    //     role: user?.role,
    // };

    // const accessToken: string =  createToken(
    //         tokenPayload,
    //         config.jwt.secret as Secret,
    //         config.jwt.expires_in as SignOptions["expiresIn"]
    //     );

    // const refreshToken = createToken(
    //     jwtPayload,
    //     config.jwt_refresh_secret as string,
    //     config.jwt_refresh_expires_in as string
    // );

    return  null;
};

const adminSendVerifyCodeService = async (payload:{email: string}) => {
    const { email } = payload;

    const admin = await AdminModel.findOne({ email: email });

    if (!admin) {
        throw new ApiError(404, 'Admin not found to send otp');
    }

    const {code, expiredAt} = generateVerifyCode(10);

    
    admin.verificationCode = code;

    await admin.save();

    await sendVerificationEmail(email,{
        name: admin.name,
        code: code
    });

    return null;
}


const adminResetPasswordService = async (userDetails: JwtPayload,payload: {newPassword: string,confirmPassword: string}) => {
    const { newPassword } = payload;
    const {email} = userDetails;

    const admin = await AdminModel.findOne({ email: email });

    if (!admin) {
        throw new ApiError(404, 'This admin does not exist to reset password');
    }

    if (admin.isBlocked) {
        throw new ApiError(403, 'This user is blocked. Cannot reset password');
    }

    //hash new password
    // const newHashedPassword = await bcrypt.hash(
    //     payload.password,
    //     Number(config.bcrypt_salt_rounds)
    // );

    admin.password = newPassword;
    await admin.save();

    //generate new token after password reset
    const tokenPayload = {
        userId: admin?._id as string,
        role: admin?.role,
        email: admin?.email
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

    return {user:{name:admin.name,email:admin.email,role:admin.role}, accessToken };
};

const editProfileService = async (userDetails: JwtPayload,file: Express.Multer.File | undefined, payload: Partial<IAdmin>) => {
    const {userId} = userDetails;

    if(!userId){
        throw new ApiError(400,"Admin id is required to edit admin profile");
    }

    const admin = await AdminModel.findById(userId);

    // Handle image update
    if (file) {
        if (admin.image) { deleteOldFile(admin.image as string); }

        admin.image = `uploads/admin-image/${file.filename}`;
    }

    if(payload.name) admin.name = payload.name;
    if(payload.contact) admin.contact = payload.contact;
    if(payload.address) admin.address = payload.address;

    await admin.save();
    
    return null;
    
}

const changeAdminPasswordService = async (userDetails: JwtPayload, payload: IChangePassword) => {
    // Service logic goes here
    const { userId } = userDetails;
    const { currentPassword, newPassword } = payload;

    const admin =  await AdminModel.findById(userId).select('+password');
    if(!admin){
        throw new ApiError(404,'Admin not found to change password');
    }

    // const isPasswordMatched = await user.isPasswordMatched(oldPassword);
    // if(!isPasswordMatched){
    //     throw new ApiError(400,'Old password is incorrect');
    // }

    if(admin.password !== currentPassword){
        throw new ApiError(400,'Old password is incorrect');
    }

    admin.password = newPassword;

    await admin.save();

    return null;
}

const deleteAdminService = async (userDetails: JwtPayload) => {
    const {userId} = userDetails;
    if(!userId){
        throw new ApiError(400,"User id is required to delete account");
    }

    const deletedAccount = await AdminModel.findByIdAndDelete(userId);

    if(!deletedAccount){
        throw new ApiError(500,"Failed to delete admin account.");
    }

    deleteOldFile(deletedAccount.image);

    return null;
}

const blockAdminService = async (userId: string) => {
    // const {userId} = query;
    
    if(!userId){
        throw new ApiError(400,"Admin id is required to block a admin");
    }

    const admin = await AdminModel.findById(userId);

    //block unblock admin
    admin.isBlockd = !admin.isBlockd;
    await admin.save();

    let msg;
    if(admin.isBlockd) msg = 'Admin is blocked successfully.';
    else msg = 'Admin is unblocked.';

    return {admin:{name: admin.name}, msg };
}

const dashboardStatService = async () => {

    // const [totalUsers,totalPosts,activePost] = await Promise.all([
    //     UserModel.countDocuments(),
    //     PostModel.countDocuments(),
    //     PostModel.countDocuments({status: { $ne: ENUM_POST_STATUS.DELIVERED}})
    // ]);

    // return {
    //     totalUsers,
    //     totalPosts,
    //     activePost
    // }
    
};


const DashboardService = {
    registerAdminService,
    loginAdminService,
    adminVerifyCode,
    adminSendVerifyCodeService,
    adminResetPasswordService,
    editProfileService,
    changeAdminPasswordService,
    deleteAdminService,
    blockAdminService,
    dashboardStatService,
    // salesActivityService
}

export default DashboardService;

