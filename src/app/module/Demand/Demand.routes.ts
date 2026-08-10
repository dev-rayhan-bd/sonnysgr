import express from "express";
import { auth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import DemandValidations from "./Demand.validation";
import DemandController from "./Demand.controller";

const DemandRouter = express.Router();

DemandRouter.get(
  "/local",
  auth(["Retailer"]),
  validateRequest(DemandValidations.localDemandQuerySchema),
  DemandController.getLocalDemand
);

DemandRouter.get(
  "/size/:productId",
  auth(["Retailer"]),
  validateRequest(DemandValidations.sizeDemandQuerySchema),
  DemandController.getSizeDemand
);

DemandRouter.get(
  "/gaps",
  auth(["Retailer"]),
  validateRequest(DemandValidations.demandGapsQuerySchema),
  DemandController.getDemandGaps
);

export default DemandRouter;
