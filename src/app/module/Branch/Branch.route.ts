import express from "express";
import { auth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { uploadRetailerFields } from "../../middlewares/multerMiddleware";
import { BranchValidations } from "./Branch.validation";
import { BranchController } from "./Branch.controller";

const BranchRouter = express.Router();

// Retailer routes
BranchRouter.post(
  "/add-new-branch",
  auth(["Retailer"]),
  uploadRetailerFields.fields([
    { name: "profile-image", maxCount: 1 },
    { name: "cover-image", maxCount: 1 },
  ]),
  validateRequest(BranchValidations.addNewBranchValidationSchema),
  BranchController.createBranch
);

BranchRouter.patch(
  "/edit-branch/:id",
  auth(["Retailer"]),
  uploadRetailerFields.fields([
    { name: "profile-image", maxCount: 1 },
    { name: "cover-image", maxCount: 1 },
  ]),
  validateRequest(BranchValidations.updateBranchValidationSchema),
  BranchController.updateBranch
);

BranchRouter.delete(
  "/delete-branch/:id",
  auth(["Retailer"]),
  BranchController.deleteBranch
);

BranchRouter.get(
  "/my-branches",
  auth(["Retailer"]),
  BranchController.getMyBranches
);

BranchRouter.get(
  "/:id",
  auth(["Retailer"]),
  BranchController.getSingleBranch
);

// Admin dashboard routes
BranchRouter.get(
  "/admin/get-all",
  auth(["Admin", "Super_Admin"]),
  BranchController.getAllBranchesForAdmin
);

BranchRouter.get(
  "/admin/:id",
  auth(["Admin", "Super_Admin"]),
  BranchController.getSingleBranchForAdmin
);

export default BranchRouter;
