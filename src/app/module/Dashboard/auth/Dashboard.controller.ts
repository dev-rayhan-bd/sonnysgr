import { AuthRequest } from "../../../../interface/authRequest";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import DashboardService from "./Dashboard.service";


const adminRegister = catchAsync(
    async (req,res) => {
        const result = await DashboardService.registerAdminService(req.body);

        sendResponse(res,{
            statusCode: 201,
            success: true,
            message: "New admin created",
            data: result
        });
    }
);

const adminLogin = catchAsync(
    async (req,res) => {
        const result = await DashboardService.loginAdminService(req.body);

        sendResponse(res,{
            statusCode: 200,
            success: true,
            message: "Admin logged in successfully.",
            data: result
        });
    }
);

const adminVerifyCode = catchAsync(async (req, res) => {
    
    const result = await DashboardService.adminVerifyCode(req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Code verified successfully.",
        data: result,
    });
});

const adminSendVerifyCode = catchAsync(async (req, res) => {
    
    const result = await DashboardService.adminSendVerifyCodeService(req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Verification code sent successfully.",
        data: result,
    });
});

const adminResetPassword = catchAsync(async (req, res) => {

     const { user } = req as AuthRequest;
    
    const result = await DashboardService.adminResetPasswordService(user,req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Password reset successfully.",
        data: result,
    });
});

const editAdminProfile = catchAsync(
    async (req,res) => {
         const { user } = req as AuthRequest;

        const result = await DashboardService.editProfileService(user,req.file,req.body);

        sendResponse(res,{
            statusCode: 200,
            success: true,
            message: "Updated admin data successfully",
            data: result
        });
    }
);

const changeAdminPassword = catchAsync(
    async (req,res) => {

         const { user } = req as AuthRequest;

        const result = await DashboardService.changeAdminPasswordService(user,req.body);

        sendResponse(res,{
            statusCode: 200,
            success: true,
            message: "Admin password changed successfully",
            data: result
        });
    }
);

const deleteAdminAccount = catchAsync(
    async (req,res) => {
         const { user } = req as AuthRequest;
        const result = await DashboardService.deleteAdminService(user);

        sendResponse(res,{
            statusCode: 200,
            success: true,
            message: "Admin deleted successfully.",
            data: null
        });
    }
);

const dashboardStat = catchAsync(
    async (req,res) => {
        // const result = await DashboardService.dashboardStatService();

        // sendResponse(res,{
        //     statusCode: 200,
        //     success: true,
        //     message: "Got website stat",
        //     data: result
        // });
    }
);

const getMyProfile = catchAsync(
    async (req, res) => {
        const { user } = req as AuthRequest;
        const result = await DashboardService.getMyProfileService(user);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Admin profile retrieved successfully",
            data: result
        });
    }
);

const blockAdmin = catchAsync(
    async (req,res) => {
        const result = await DashboardService.blockAdminService(req.params.id);

        sendResponse(res,{
            statusCode: 200,
            success: true,
            message: result.msg,
            data: result.admin
        });
    }
);


const DashboardController = {
    adminRegister,
    adminLogin,
    adminVerifyCode,
    adminSendVerifyCode,
    adminResetPassword,
    editAdminProfile,
    changeAdminPassword,
    deleteAdminAccount,
    dashboardStat,
    getMyProfile,
    blockAdmin
}

export default DashboardController;