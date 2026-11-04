import express from "express";
import {auth, authorizeUser} from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import PromotionValidations from "./Promotion.validation";
import PromotionController from "./Promotion.controller";
import { uploadPromotionalImage } from "../../middleware/multerMiddleware";


const PromotionRouter = express.Router();

PromotionRouter.post(
    "/send-new-promotion",
    authorizeUser,
    uploadPromotionalImage.array("promotion-image", 5),
    validateRequest(PromotionValidations.createNewPromotionValidation),
    PromotionController.createNewPromotionController
);

PromotionRouter.patch(
    "/edit-promotion/:id",
    authorizeUser,
    uploadPromotionalImage.array("promotion-image", 5),
    // validateRequest(PromotionValidations.createNewPromotionValidation),
    PromotionController.editPromotion
);


PromotionRouter.get(
    "/get-all-promotion",
    authorizeUser,
    // validateRequest(PromotionValidations.createNewPromotionValidation),
    PromotionController.getAllPreviousPromotion
);

PromotionRouter.get(
    "/get-buyer-promotion",
    authorizeUser,
    PromotionController.getBuyerPromotion
);


export default PromotionRouter;