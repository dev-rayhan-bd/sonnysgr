import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import SourcingValidations from "./Sourcing.validation";
import SourcingController from "./Sourcing.controller";

const SourcingRouter = express.Router();

// --- Retailer Reseller Sourcing Endpoints ---

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

// Toggle trusted status of a reseller (Like / Unlike / Favourite)
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

// Retailers view local community demand / wanted sneakers feed
SourcingRouter.get(
  "/community-demand",
  auth(["Retailer"]),
  validateRequest(SourcingValidations.communityDemandQueryValidation),
  SourcingController.getCommunityDemandFeedController
);

// Retailer responds to a buyer's wanted sneaker request (initiates chat + match)
SourcingRouter.post(
  "/respond/:id",
  auth(["Retailer"]),
  validateRequest(SourcingValidations.respondToSourcingRequestValidation),
  SourcingController.respondToSourcingRequestController
);

// --- Buyer Wanted Grails & Sourcing Request Endpoints ---

// Buyer posts a sneaker sourcing / wanted pair request
SourcingRouter.post(
  "/request",
  auth(["Buyer"]),
  validateRequest(SourcingValidations.createSourcingRequestValidation),
  SourcingController.createSourcingRequestController
);

// Buyer retrieves their own submitted requests
SourcingRouter.get(
  "/my-requests",
  auth(["Buyer"]),
  SourcingController.getBuyerSourcingRequestsController
);

export default SourcingRouter;
