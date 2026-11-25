import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import SupportValidations from "./Support.validation";
import SupportController from "./Support.controller";

import { uploadProfile } from "../../middleware/multerMiddleware";
import { uploadFilesToCloudUrls } from "../../../helper/cloudStorage";

const SupportRouter = express.Router();

// User endpoints (Mobile app)
SupportRouter.post(
  "/tickets",
  auth(["Buyer"]),
  uploadProfile.any(), // Parses multipart/form-data text fields and files into req.body/req.files
  async (req, res, next) => {
    // Transform isTimeSensitive to boolean if sent as string from form-data
    if (typeof req.body.isTimeSensitive === 'string') {
      req.body.isTimeSensitive = req.body.isTimeSensitive === 'true';
    }
    // Handle uploaded files through multipart/form-data: stream them to Cloudinary / S3
    if (Array.isArray(req.files) && req.files.length > 0) {
      req.body.attachments = await uploadFilesToCloudUrls(req.files, "support");
    } else if (typeof req.body.attachments === 'string') {
      try {
        req.body.attachments = JSON.parse(req.body.attachments);
      } catch {
        req.body.attachments = [req.body.attachments];
      }
    } else if (!req.body.attachments) {
      req.body.attachments = [];
    }
    next();
  },
  validateRequest(SupportValidations.createTicketValidationSchema),
  SupportController.createTicket
);

SupportRouter.get(
  "/presigned-url",
  auth(["Buyer", "Retailer", "Reseller"]),
  SupportController.getPresignedUrl
);

// Admin endpoints
SupportRouter.get(
  "/admin/tickets",
  auth(["Admin", "Super_Admin"]),
  SupportController.getTicketsAdmin
);

SupportRouter.post(
  "/admin/tickets/:ticketId/resolve",
  auth(["Admin", "Super_Admin"]),
  validateRequest(SupportValidations.resolveTicketValidationSchema),
  SupportController.resolveTicket
);

export default SupportRouter;
