import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { ResellerFacadeService } from "./ResellerFacadeService";
import { IJwtPayload } from "../../../interface/jwt.interface";

const resellerHomePageStatDataController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await ResellerFacadeService.getDashboardMetrics(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reseller dashboard metrics fetched successfully",
    data: result,
  });
});

const proposeAnOfferToResellerForPairRequestController = catchAsync(
  async (req: Request, res: Response) => {
    const user = (req as any).user as IJwtPayload;
    const result = await ResellerFacadeService.makeRequestForPair(user, req.body);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Pair request submitted successfully",
      data: result,
    });
  }
);

const updateResellerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  const result = await ResellerFacadeService.updateProfile(user, files, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Updated reseller profile successfully",
    data: result,
  });
});

const resellerProfileStatData = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await ResellerFacadeService.getProfileStatData(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reseller profile stat data fetched successfully",
    data: result,
  });
});

const getResellerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await ResellerFacadeService.getMyProfile(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reseller profile fetched successfully",
    data: result,
  });
});

const getPublicResellerProfileController = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ResellerFacadeService.getPublicResellerProfile(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Public reseller profile fetched successfully",
    data: result,
  });
});

const updateVisibilityControlsController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await ResellerFacadeService.updateVisibilityControls(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Visibility and privacy controls updated successfully",
    data: result,
  });
});

const ResellerController = {
  resellerHomePageStatDataController,
  proposeAnOfferToResellerForPairRequestController,
  updateResellerProfile,
  resellerProfileStatData,
  getResellerProfile,
  getPublicResellerProfileController,
  updateVisibilityControlsController,
};

export default ResellerController;
