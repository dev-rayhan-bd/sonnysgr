import express from "express";
import { auth } from "../../middlewares/auth";
import { ENUM_USER_Type } from "../../../utilities/enum";
import { uploadProductImage } from "../../middlewares/multerMiddleware";
import DropController from "./Drop.controller";

const DropRouter = express.Router();

DropRouter.post(
  "/create-drop",
  auth([ENUM_USER_Type.RETAILER]),
  uploadProductImage.array("drop-image", 8),
  DropController.createDropController
);

DropRouter.patch(
  "/edit-drop/:id",
  auth([ENUM_USER_Type.RETAILER]),
  uploadProductImage.array("drop-image", 8),
  DropController.editDropController
);

DropRouter.delete(
  "/delete-drop/:id",
  auth([ENUM_USER_Type.RETAILER]),
  DropController.deleteDropController
);

DropRouter.get(
  "/get-drop",
  auth([ENUM_USER_Type.RETAILER]),
  DropController.getDropController
);

export default DropRouter;
