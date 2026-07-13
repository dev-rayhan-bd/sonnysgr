import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import PairsValidations from "./Pairs.validation";
import PairsController from "./Pairs.controller";
import { uploadProfile } from "../../middlewares/multerMiddleware";


const PairsRouter = express.Router();

PairsRouter.post(
    "/add-new-pairs",
    authorizeUser,
    uploadProfile.array("pair-image",8),
    // validateRequest(PairsValidations.addnewPairValidationSchema),
    PairsController.addNewPairsController
);

PairsRouter.patch(
    "/edit-pairs/:id",
    authorizeUser,
     uploadProfile.array("pair-image",8),
    // validateRequest(PairsValidations.addnewPairValidationSchema),
    PairsController.editPairsController
);


//get my listed pair
PairsRouter.get(
    "/get-listed-pairs",
    authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.getAllListedPairsController
);


PairsRouter.get(
    "/get-single-pair/:id",
    // authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.getSinglePairDetailsController
);

//retailer

PairsRouter.post(
    "/request-new-pair",
    authorizeUser,
    // validateRequest(PairsValidations.makeRequestForPairValidationSchema),
    PairsController.makeRequestForPairController
);

PairsRouter.post(
    "/get-retailer-pair-request",
    authorizeUser,
    // validateRequest(PairsValidations.makeRequestForPairValidationSchema),
    PairsController.getAllRetailerPairRequestController
);

PairsRouter.post(
    "/retailer-propose-counter-offer",
    authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.retailerProposeCounterOfferToPairRequestController
);


//reseller
//get all pair request

PairsRouter.get(
    "/get-pair-requests",
    authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.getAllpairRequestController
);

PairsRouter.get(
    "/get-single-pair-request/:id",
    // authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.getSinglePairRequestDetails
);

PairsRouter.post(
    "/accept-pair-request/:id",
    authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.acceptPairRequestController
);

PairsRouter.post(
    "/reject-pair-request/:id",
    authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.rejectPairRequestController
);

PairsRouter.post(
    "/propose-counter-offer",
    authorizeUser,
    // validateRequest(PairsValidations.addNewPairsZodSchema),
    PairsController.proposeCounterOfferToPairRequestController
);


export default PairsRouter;