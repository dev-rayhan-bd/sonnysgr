import { Request, Response } from "express";
import { AuthRequest } from "../../../../interface/authRequest";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import WishlistServices from "./wishlist.service";

const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await WishlistServices.addToWishlistService(user.profileId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Product added to wishlist successfully.",
    data: result,
  });
});

const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const { productId } = req.params;

  const result = await WishlistServices.removeFromWishlistService(user.profileId, productId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product removed from wishlist successfully.",
    data: result,
  });
});

const getWishlist = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await WishlistServices.getWishlistService(user.profileId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Wishlist retrieved successfully.",
    data: result,
  });
});

export const WishlistController = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
export default WishlistController;
