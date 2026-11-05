import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { SourcingFacadeService } from "./SourcingFacadeService";
import { IJwtPayload } from "../../../interface/jwt.interface";

const toggleTrustResellerController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const { resellerId } = req.body;

  const result = await SourcingFacadeService.toggleTrustReseller(
    user.profileId,
    resellerId
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getAllActiveResellersController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await SourcingFacadeService.getAllActiveResellers(user.profileId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active resellers fetched successfully",
    data: result,
  });
});

const getTrustedResellersController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await SourcingFacadeService.getTrustedResellers(user.profileId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Trusted resellers with profile and inventory fetched successfully",
    data: result,
  });
});

const getResellerProductsController = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await SourcingFacadeService.getResellerProducts(id, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reseller products fetched successfully",
    meta: result.meta,
    data: result.products,
  });
});

// --- Buyer Sneaker Sourcing / Wanted Pairs ---

const createSourcingRequestController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await SourcingFacadeService.createSourcingRequest(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Sourcing request posted successfully",
    data: result,
  });
});

const getBuyerSourcingRequestsController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await SourcingFacadeService.getBuyerSourcingRequests(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Buyer sourcing requests retrieved successfully",
    data: result,
  });
});

const getCommunityDemandFeedController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const result = await SourcingFacadeService.getCommunityDemandFeed(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Community demand feed retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const respondToSourcingRequestController = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const id = req.params.id as string;
  const result = await SourcingFacadeService.respondToSourcingRequest(user, id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Response to sourcing request submitted and chat initiated",
    data: result,
  });
});

const SourcingController = {
  toggleTrustResellerController,
  getAllActiveResellersController,
  getTrustedResellersController,
  getResellerProductsController,
  createSourcingRequestController,
  getBuyerSourcingRequestsController,
  getCommunityDemandFeedController,
  respondToSourcingRequestController,
};

export default SourcingController;
