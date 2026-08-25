import express from "express";
import { auth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import SupportValidations from "./Support.validation";
import SupportController from "./Support.controller";

import { uploadProfile } from "../../middlewares/multerMiddleware";

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
    // Parse attachments array if sent as string/serialized JSON or single item
    if (typeof req.body.attachments === 'string') {
      try {
        req.body.attachments = JSON.parse(req.body.attachments);
      } catch {
        req.body.attachments = [req.body.attachments];
      }
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
