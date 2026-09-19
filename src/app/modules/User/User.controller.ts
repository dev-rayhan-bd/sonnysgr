import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { AuthRequest } from "../../../interface/authRequest";
import UserServices from "./User.service";



const updateProfile = catchAsync(async (req, res) => {

     const { user } = req as AuthRequest;

    const result = await UserServices.updateUserProfile(user ,req.file, req.body);
    
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Profile updated successfully.",
        data: result,
    });
});

const getMyProfile = catchAsync(async (req, res) => {

     const { user } = req as AuthRequest;

    const result = await UserServices.getMyProfile(user);
    
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Profile detail retrieved.",
        data: result,
    });
});



const changePassword = catchAsync(async (req, res) => {

     const { user } = req as AuthRequest;

    const result = await UserServices.changePasswordService(user,req.body);
    
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Password changed successfully.",
        data: result,
    });
});

//dashboard

const dashboardGetUser = catchAsync(async (req, res) => {

    const result:any = await UserServices.getAllUserService(req.query);
    
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved all users successfully.",
        meta: result.meta,
        data: result,
    });
});

const blockUser = catchAsync(async (req, res) => {

    const result = await UserServices.blockUserService(req.params.id);
    
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User blocked/unblocked successfully.",
        data: result,
    });
});

const UserController = { 
    updateProfile,
    getMyProfile,
    changePassword,
    dashboardGetUser,
    blockUser
 };
export default UserController;