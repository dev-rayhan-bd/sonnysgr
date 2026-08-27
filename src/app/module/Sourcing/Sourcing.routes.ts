import express from "express";
import { auth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import SourcingValidations from "./Sourcing.validation";
import SourcingController from "./Sourcing.controller";

const SourcingRouter = express.Router();

// --- Retailer Endpoints ---

// Get all active approved resellers with trust badges
SourcingRouter.get(
  "/resellers",
  auth(["Retailer"]),
  SourcingController.getAllActiveResellersController
);

// Get reseller products by reseller ID
SourcingRouter.get(
  "/resellers/:id/products",
  auth(["Retailer"]),
  SourcingController.getResellerProductsController
);

// Toggle trusted status of a reseller (Like / Unlike)
SourcingRouter.post(
  "/toggle-trust",
  auth(["Retailer"]),
  validateRequest(SourcingValidations.toggleTrustValidation),
  SourcingController.toggleTrustResellerController
);

// Get all trusted resellers and their profile + product inventories
SourcingRouter.get(
  "/trusted-resellers",
  auth(["Retailer"]),
  SourcingController.getTrustedResellersController
);

// Send sourcing request to a trusted reseller
SourcingRouter.post(
  "/request",
  auth(["Retailer"]),
  validateRequest(SourcingValidations.createSourcingRequestValidation),
  SourcingController.createSourcingRequestController
);

// View outgoing sourcing requests
SourcingRouter.get(
  "/requests/retailer",
  auth(["Retailer"]),
  SourcingController.getRetailerSourcingRequestsController
);


// --- Reseller Endpoints ---

// View incoming sourcing requests
SourcingRouter.get(
  "/requests/reseller",
  auth(["Reseller"]),
  SourcingController.getResellerSourcingRequestsController
);

// Respond to sourcing request (Accept / Reject)
SourcingRouter.patch(
  "/request/:id/respond",
  auth(["Reseller"]),
  validateRequest(SourcingValidations.respondSourcingRequestValidation),
  SourcingController.respondToSourcingRequestController
);

export default SourcingRouter;
