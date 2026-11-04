import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import SupportValidations from "./Support.validation";
import SupportController from "./Support.controller";

import { uploadProfile } from "../../middleware/multerMiddleware";

const SupportRouter = express.Router();

// User endpoints (Mobile app)
SupportRouter.post(
  "/tickets",
  auth(["Buyer"]),
  uploadProfile.any(), // Parses multipart/form-data text fields and files into req.body/req.files
  (req, res, next) => {
    // Transform isTimeSensitive to boolean if sent as string from form-data
    if (typeof req.body.isTimeSensitive === 'string') {
      req.body.isTimeSensitive = req.body.isTimeSensitive === 'true';
    }
    // Handle uploaded files through multipart/form-data
    if (req.files && Array.isArray(req.files)) {
      const fileUrls = req.files.map((file: any) => {
        // If file.location is present (MulterS3), use it, otherwise use local path
        return file.location || `uploads/profile-image/${file.filename}`;
      });
      req.body.attachments = fileUrls;
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
  auth(["Retailer", "Reseller"]), // Standard platform admin verification in current roles structure
  SupportController.getTicketsAdmin
);

SupportRouter.post(
  "/admin/tickets/:ticketId/resolve",
  auth(["Retailer", "Reseller"]),
  validateRequest(SupportValidations.resolveTicketValidationSchema),
  SupportController.resolveTicket
);

export default SupportRouter;
