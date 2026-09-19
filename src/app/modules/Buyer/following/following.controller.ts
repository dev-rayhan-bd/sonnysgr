import { Request, Response } from "express";
import { AuthRequest } from "../../../../interface/authRequest";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import FollowingServices from "./following.service";

const addToFollowing = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await FollowingServices.addToFollowingService(user.profileId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Product added to follow list successfully.",
    data: result,
  });
});

const removeFromFollowing = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const { productId } = req.params;

  const result = await FollowingServices.removeFromFollowingService(user.profileId, productId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product removed from follow list successfully.",
    data: result,
  });
});

const getFollowing = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await FollowingServices.getFollowingService(user.profileId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Follow list retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

export const FollowingController = {
  addToFollowing,
  removeFromFollowing,
  getFollowing,
};
export default FollowingController;
