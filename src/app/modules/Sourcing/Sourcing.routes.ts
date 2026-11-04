import express from "express";
import { auth } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
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

export default SourcingRouter;
