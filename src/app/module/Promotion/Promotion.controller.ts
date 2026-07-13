import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import PromotionServices from "./Promotion.service";

const createNewPromotionController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await PromotionServices.createNewPromotionService(user, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Promotion created successfully",
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
        data: result,
    });
});

const PromotionController = { 
    createNewPromotionController,
    getAllPreviousPromotion
 };



export default PromotionController;