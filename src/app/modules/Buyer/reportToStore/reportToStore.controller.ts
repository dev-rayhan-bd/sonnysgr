import { Request, Response } from "express";
import { AuthRequest } from "../../../../interface/authRequest";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import ReportToStoreServices from "./reportToStore.service";

const createReport = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const files = (req.files as Express.Multer.File[]) || [];

  const result = await ReportToStoreServices.createReportService(
    user.profileId,
    files,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Report submitted successfully.",
    data: result,
  });
});

export const ReportToStoreController = {
  createReport,
};

export default ReportToStoreController;
