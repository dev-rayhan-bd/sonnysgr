import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import { uploadReportImage } from "../../../middleware/multerMiddleware";
import ReportToStoreValidations from "./reportToStore.validation";
import ReportToStoreController from "./reportToStore.controller";

const ReportToStoreRouter = express.Router();

ReportToStoreRouter.post(
  "/create",
  auth(["Buyer"]),
  uploadReportImage.array("report-image", 4),
  validateRequest(ReportToStoreValidations.createReportValidationSchema),
  ReportToStoreController.createReport
);

export default ReportToStoreRouter;
