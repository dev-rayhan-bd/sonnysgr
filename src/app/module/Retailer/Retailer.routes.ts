import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import RetailerValidations from "./Retailer.validation";
import RetailerController from "./Retailer.controller";
import { uploadProfile } from "../../middlewares/multerMiddleware";


const RetailerRouter = express.Router();


RetailerRouter.get(
    "/get-nearby-retailers",
    validateRequest(RetailerValidations.validateLatLongTofilterNearbyRetailers),
    RetailerController.filterNearbyRetailersController
);

//buyer map page

RetailerRouter.get(
    "/get-nearby-retailer-map",
    validateRequest(RetailerValidations.validateLatLongTofilterNearbyRetailers),
    RetailerController.getAllNearbyRetailerForMap
);

//retailer inventory

RetailerRouter.get(
    "/get-retailer-inventory",
    authorizeUser,
    RetailerController.getRetailerInventoryController
);

//retailer order

RetailerRouter.get(
    "/get-retailer-order",
    authorizeUser,
    RetailerController.getRetailerAllOrdersController
);

RetailerRouter.post(
    "/toggle-retailer-operation-hour",
    authorizeUser,
    RetailerController.toggleRetailerOperationHourController
);

RetailerRouter.patch(
    "/update-retailer-profile",

    authorizeUser,

    uploadProfile.fields([
        {
            name: "profile-image",
            maxCount: 1,
        },
        {
            name: "cover-image",
            maxCount: 1,
        },
    ]),

    // validateRequest(RetailerValidations.addNewBranchValidationSchema),

    RetailerController.updateRetailerProfile
),

RetailerRouter.post(
    "/add-verification-info",

    authorizeUser,

    uploadProfile.fields([
        {
            name: "retailer-file",
            maxCount: 1,
        },
        {
            name: "cover-image",
            maxCount: 1,
        },
    ]),

    validateRequest(RetailerValidations.addVerificationInfoValidationSchema),

    RetailerController.addVerificationInfo
),


//branch


RetailerRouter.post(
    "/add-new-branch",

    authorizeUser,

    uploadProfile.fields([
        {
            name: "profile-image",
            maxCount: 1,
        },
        {
            name: "cover-image",
            maxCount: 1,
        },
    ]),

    validateRequest(RetailerValidations.addNewBranchValidationSchema),

    RetailerController.addNewBranchController
),

RetailerRouter.get(
    "/get-all-branch",
    authorizeUser,
    RetailerController.getAllBranchController
);




export default RetailerRouter;