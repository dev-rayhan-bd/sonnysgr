import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import PromotionServices from "./Promotion.service";

const createNewPromotionController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await PromotionServices.createNewPromotionService(
    user,
    req.files as Express.Multer.File[] | undefined,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Promotion created successfully",
    data: result,
  });
});

const editPromotion = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await PromotionServices.editPromotionService(
    user,
    req.files as Express.Multer.File[] | undefined,
    req.params.id,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Promotion updated successfully.",
    data: result,
  });
});

const getAllPreviousPromotion = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await PromotionServices.getAllRetailerPromotion(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved all promotion.",
    data: result.data,
    meta: result.meta,
  });
});

const getBuyerPromotion = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await PromotionServices.getAllBuyerPromotion(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved buyer promotions successfully.",
    data: result,
  });
});

const getAudiencePreview = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await PromotionServices.getAudiencePreview(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Audience reach preview calculated successfully.",
    data: result,
  });
});

const PromotionController = {
  createNewPromotionController,
  editPromotion,
  getAllPreviousPromotion,
  getBuyerPromotion,
  getAudiencePreview,
};

export default PromotionController;
