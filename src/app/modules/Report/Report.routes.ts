import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import ReportValidations from "./Report.validation";
import ReportController from "./Report.controller";
import { uploadReportImage } from "../../middlewares/multerMiddleware";


const ReportRouter = express.Router();


ReportRouter.post("/add-new-report",
    authorizeUser,
    uploadReportImage.array("report-image",4),
    validateRequest(ReportValidations.addReportValidationSchema),
    ReportController.addnewReport
);


export default ReportRouter;