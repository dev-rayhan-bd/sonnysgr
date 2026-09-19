import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import ReportServices from "./Report.service";

const addnewReport = catchAsync(async (req, res) => {

    const {user} = req as AuthRequest;

    const files = req.files as Express.Multer.File[];

    const result = await ReportServices.createNewReport(user,files,req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Report submitted.",
        data: result,
    });
});

const ReportController = { 
    addnewReport
 };

export default ReportController;