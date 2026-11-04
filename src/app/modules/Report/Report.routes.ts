import express from "express";
import {auth, authorizeUser} from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import ReportValidations from "./Report.validation";
import ReportController from "./Report.controller";
import { uploadReportImage } from "../../middleware/multerMiddleware";


const ReportRouter = express.Router();


ReportRouter.post("/add-new-report",
    authorizeUser,
    uploadReportImage.array("report-image",4),
    validateRequest(ReportValidations.addReportValidationSchema),
    ReportController.addnewReport
);


export default ReportRouter;