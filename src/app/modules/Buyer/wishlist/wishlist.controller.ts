import { AuthRequest } from "../../../../interface/authRequest";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import WishlistFacadeService from "./WishlistFacadeService";
import { StatusCodes } from "http-status-codes";

const addToWishlistController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await WishlistFacadeService.addToWishlist(user.profileId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Sneaker added to wishlist with size preferences.",
    data: result,
  });
});

const removeFromWishlistController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const productId = req.params.productId || req.params.id;
  const desiredSize = (req.query.desiredSize as string) || req.body?.desiredSize;

  const result = await WishlistFacadeService.removeFromWishlist(
    user.profileId,
    productId,
    desiredSize
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Sneaker removed from wishlist successfully.",
    data: result,
  });
});

const getWishlistController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await WishlistFacadeService.getWishlist(user.profileId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wishlist retrieved with live size stock status.",
    data: result,
  });
});

const toggleWantedGrailController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await WishlistFacadeService.toggleWantedGrail(user.profileId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.isWanted
      ? "Sneaker flagged as Wanted Grail for store notifications."
      : "Sneaker removed from Wanted Grails.",
    data: result,
  });
});

const getWantedGrailsController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await WishlistFacadeService.getWantedGrails(user.profileId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Customer's wanted grails retrieved successfully.",
    data: result,
  });
});

const WishlistController = {
  addToWishlistController,
  removeFromWishlistController,
  getWishlistController,
  toggleWantedGrailController,
  getWantedGrailsController,
};

export default WishlistController;
