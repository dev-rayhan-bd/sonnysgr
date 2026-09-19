import express from "express";
import {auth} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import RetailerValidations from "./Retailer.validation";
import RetailerController from "./Retailer.controller";
import { uploadRetailerFields } from "../../middlewares/multerMiddleware";


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
    auth(["Retailer"]),
    validateRequest(RetailerValidations.getRetailerInventoryValidationSchema),
    RetailerController.getRetailerInventoryController
);

//retailer order

RetailerRouter.get(
    "/get-retailer-order",
    auth(["Retailer"]),
    RetailerController.getRetailerAllOrdersController
);

RetailerRouter.post(
    "/toggle-retailer-operation-hour",
    auth(["Retailer"]),
    RetailerController.toggleRetailerOperationHourController
);

RetailerRouter.patch(
    "/update-retailer-profile",

    auth(["Retailer"]),

    uploadRetailerFields.fields([
        {
            name: "profile-image",
            maxCount: 1,
        },
        {
            name: "cover-image",
            maxCount: 1,
        },
        {
            name: "licence",
            maxCount: 1,
        },
    ]),

    // validateRequest(RetailerValidations.addNewBranchValidationSchema),

    RetailerController.updateRetailerProfile
),

RetailerRouter.post(
    "/add-verification-info",

    auth(["Retailer"]),

    uploadRetailerFields.fields([
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


// profile completion


RetailerRouter.patch("/complete-retailer-profile",
    auth(["Retailer"], false),
    uploadRetailerFields.fields([
        {
            name: "profile-image",
            maxCount: 1,
        },
        {
            name: "cover-image",
            maxCount: 1,
        },
        {
            name: "licence",
            maxCount: 1,
        },
    ]),
    validateRequest(RetailerValidations.completeRetailerProfileValidation),
    RetailerController.completeRetailerProfileController
);


import DemandRouter from "../Demand/Demand.routes";

RetailerRouter.use("/demand", DemandRouter);

export default RetailerRouter;