import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import PromotionValidations from "./Promotion.validation";
import PromotionController from "./Promotion.controller";


const PromotionRouter = express.Router();

PromotionRouter.post(
    "/send-new-promotion",
    authorizeUser,
    validateRequest(PromotionValidations.createNewPromotionValidation),
    PromotionController.createNewPromotionController
);


PromotionRouter.get(
    "/get-all-promotion",
    authorizeUser,
    // validateRequest(PromotionValidations.createNewPromotionValidation),
    PromotionController.getAllPreviousPromotion
);


export default PromotionRouter;