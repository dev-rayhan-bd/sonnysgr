import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import LockerFacadeService from "./LockerFacadeService";
import { IJwtPayload } from "../../../interface/jwt.interface";

const addSneakerToLocker = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const files = req.files as Express.Multer.File[] | undefined;

  const result = await LockerFacadeService.addSneakerToLocker(user, files, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Sneaker added to locker successfully",
    data: result,
  });
});

const updateLockerItem = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const files = req.files as Express.Multer.File[] | undefined;
  const id = req.params.id as string;

  const result = await LockerFacadeService.updateLockerItem(user, id, files, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Locker sneaker updated successfully",
    data: result,
  });
});

const toggleLockerPrivacy = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const id = req.params.id as string;
  const { isPublic } = req.body;

  const result = await LockerFacadeService.toggleLockerPrivacy(
    user,
    id,
    isPublic === "true" || isPublic === true
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Locker item privacy set to ${result.isPublic ? "Public" : "Private"}`,
    data: result,
  });
});

const toggleLockerCollectionPrivacy = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const { isPublic } = req.body;

  const result = await LockerFacadeService.toggleLockerCollectionPrivacy(
    user,
    isPublic === "true" || isPublic === true
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Entire locker collection privacy set to ${result.isLockerCollectionPublic ? "Public" : "Private"}`,
    data: result,
  });
});

const deleteLockerItem = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const id = req.params.id as string;

  const result = await LockerFacadeService.deleteLockerItem(user, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Sneaker removed from locker successfully",
    data: result,
  });
});

const getMyLocker = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;

  const result = await LockerFacadeService.getMyLocker(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved personal sneaker locker successfully",
    meta: result.meta,
    data: {
      stats: result.stats,
      items: result.data,
    },
  });
});

const getSingleLockerItem = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await LockerFacadeService.getSingleLockerItem(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved locker sneaker details successfully",
    data: result,
  });
});

const getNearbyCommunityLockers = catchAsync(async (req: Request, res: Response) => {
  const result = await LockerFacadeService.getNearbyCommunityLockers(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Retrieved nearby community lockers successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCommunityLockers = catchAsync(async (req: Request, res: Response) => {
  const result = await LockerFacadeService.getCommunityLockers(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Community lockers feed retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCollectorPublicLocker = catchAsync(async (req: Request, res: Response) => {
  const buyerId = req.params.buyerId as string;
  const currentUserId = (req as any).user?.profileId;

  const result = await LockerFacadeService.getCollectorPublicLocker(buyerId, currentUserId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Collector public locker retrieved successfully",
    data: result,
  });
});

const toggleFollowCollector = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;
  const buyerId = req.params.buyerId as string;

  const result = await LockerFacadeService.toggleFollowCollector(user, buyerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getFollowedCollectors = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user as IJwtPayload;

  const result = await LockerFacadeService.getFollowedCollectors(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Followed community collectors retrieved successfully",
    data: result,
  });
});

export const LockerController = {
  addSneakerToLocker,
  updateLockerItem,
  toggleLockerPrivacy,
  toggleLockerCollectionPrivacy,
  deleteLockerItem,
  getMyLocker,
  getSingleLockerItem,
  getNearbyCommunityLockers,
  getCommunityLockers,
  getCollectorPublicLocker,
  toggleFollowCollector,
  getFollowedCollectors,
};

export default LockerController;
