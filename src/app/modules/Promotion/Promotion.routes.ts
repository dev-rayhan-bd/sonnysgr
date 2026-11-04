import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import PromotionValidations from "./Promotion.validation";
import PromotionController from "./Promotion.controller";
import { uploadPromotionalImage } from "../../middleware/multerMiddleware";

const PromotionRouter = express.Router();

// Retailer creates promotional drop with 500MB max multi-image banner upload
PromotionRouter.post(
  "/send-new-promotion",
  auth(["Retailer"]),
  uploadPromotionalImage.array("promotion-image", 5),
  validateRequest(PromotionValidations.createNewPromotionValidation),
  PromotionController.createNewPromotionController
);

PromotionRouter.patch(
  "/edit-promotion/:id",
  auth(["Retailer"]),
  uploadPromotionalImage.array("promotion-image", 5),
  PromotionController.editPromotion
);

// Retailer gets their promotions list (supports QueryBuilder search/sort/filter)
PromotionRouter.get(
  "/get-all-promotion",
  auth(["Retailer"]),
  PromotionController.getAllPreviousPromotion
);

// Audience Reach Preview for "Review your promotion" UI screen
PromotionRouter.get(
  "/audience-preview",
  auth(["Retailer"]),
  PromotionController.getAudiencePreview
);

// Buyer gets hyper-local drops feed
PromotionRouter.get(
  "/get-buyer-promotion",
  authorizeUser,
  PromotionController.getBuyerPromotion
);

export default PromotionRouter;
