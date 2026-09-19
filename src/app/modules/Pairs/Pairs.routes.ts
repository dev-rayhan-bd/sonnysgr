import express from "express";
import { auth, authorizeUser } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import PairsValidations from "./Pairs.validation";
import PairsController from "./Pairs.controller";
import { uploadPairImage } from "../../middlewares/multerMiddleware";

const PairsRouter = express.Router();

PairsRouter.post(
  "/add-new-pairs",
  auth(["Reseller"]),
  uploadPairImage.array("pair-image", 8),
  // validateRequest(PairsValidations.addnewPairValidationSchema),
  PairsController.addNewPairsController,
);

PairsRouter.patch(
  "/edit-pairs/:id",
  authorizeUser,
  uploadPairImage.array("pair-image", 8),
  // validateRequest(PairsValidations.addnewPairValidationSchema),
  PairsController.editPairsController,
);

//get my listed pair
PairsRouter.get(
  "/get-listed-pairs",
  auth(["Reseller"]),
  // validateRequest(PairsValidations.addNewPairsZodSchema),
  PairsController.getAllListedPairsController,
);

PairsRouter.get(
  "/get-single-pair/:id",
  // authorizeUser,
  // validateRequest(PairsValidations.addNewPairsZodSchema),
  PairsController.getSinglePairDetailsController,
);

//retailer

PairsRouter.post(
  "/request-new-product",
  authorizeUser,
  uploadPairImage.array("images", 8),
  PairsController.createProductRequestController,
);

PairsRouter.get(
  "/get-product-requests",
  authorizeUser,
  PairsController.getProductRequestsController,
);

PairsRouter.post(
  "/get-retailer-pair-request",
  authorizeUser,
  // validateRequest(PairsValidations.makeRequestForPairValidationSchema),
  PairsController.getAllRetailerPairRequestController,
);

PairsRouter.post(
  "/retailer-propose-counter-offer",
  authorizeUser,
  validateRequest(PairsValidations.proposeCounterOfferValidationSchema),
  PairsController.retailerProposeCounterOfferToPairRequestController,
);

//reseller
//get all pair request

PairsRouter.get(
  "/get-product-requests",
  authorizeUser,
  // validateRequest(PairsValidations.addNewPairsZodSchema),
  PairsController.getAllpairRequestController,
);

PairsRouter.get(
  "/get-single-product-request/:id",
  // authorizeUser,
  // validateRequest(PairsValidations.addNewPairsZodSchema),
  PairsController.getSinglePairRequestDetails,
);

PairsRouter.post(
  "/accept-product-request/:id",
  auth(["Reseller", ]),
  // validateRequest(PairsValidations.addNewPairsZodSchema),
  PairsController.acceptPairRequestController,
);

PairsRouter.post(
  "/cancel-product-request/:id",
  auth(["Reseller", ]),
  // validateRequest(PairsValidations.addNewPairsZodSchema),
  PairsController.cancelPairRequestController,
);

PairsRouter.post(
  "/reject-pair-request/:id",
  auth(["Reseller", "Retailer"]),
  // validateRequest(PairsValidations.addNewPairsZodSchema),
  PairsController.rejectPairRequestController,
);

PairsRouter.post(
  "/reject-product-request/:id",
  auth(["Reseller", "Retailer"]),
  PairsController.rejectPairRequestController,
);

PairsRouter.post(
  "/propose-counter-offer",
  auth(["Reseller", "Retailer"]),
  validateRequest(PairsValidations.proposeCounterOfferValidationSchema),
  PairsController.proposeCounterOfferToPairRequestController,
);

PairsRouter.patch(
  "/update-product-request-status/:id",
  auth(["Reseller"]),
  validateRequest(PairsValidations.updateProductRequestStatusValidationSchema),
  PairsController.updateProductRequestStatusController,
);

export default PairsRouter;
