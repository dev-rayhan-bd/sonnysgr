import express from "express";
import {auth} from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import ResellerValidations from "./Reseller.validation";
import ResellerController from "./Reseller.controller";
import { uploadProfile } from "../../middleware/multerMiddleware";


const ResellerRouter = express.Router();

ResellerRouter.get(
    "/reseller-homepage-stat-data",
    auth(["Reseller"]),
    ResellerController.resellerHomePageStatDataController
);

ResellerRouter.post(
    "/make-pair-request",
    auth(["Reseller"]),
    validateRequest(ResellerValidations.makeRequestForPairValidationSchema),
    ResellerController.proposeAnOfferToResellerForPairRequestController
);

ResellerRouter.patch(
    "/update-reseller-profile",
    auth(["Reseller"]),
    uploadProfile.single("profile-image"),
    ResellerController.updateResellerProfile
);

ResellerRouter.get(
    "/reseller-profile-stat-data",
    auth(["Reseller"]),
    ResellerController.resellerProfileStatData
);

ResellerRouter.get(
    "/get-reseller-profile",
    auth(["Reseller"]),
    ResellerController.getResellerProfile
);



export default ResellerRouter;