import express from "express";
import { auth } from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { uploadReportImage } from "../../../middlewares/multerMiddleware";
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
