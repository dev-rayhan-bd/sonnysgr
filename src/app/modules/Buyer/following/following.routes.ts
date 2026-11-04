import express from "express";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import FollowingValidations from "./following.validation";
import FollowingController from "./following.controller";

const FollowingRouter = express.Router();

FollowingRouter.post(
  "/add",
  auth(["Buyer"]),
  validateRequest(FollowingValidations.addToFollowingSchema),
  FollowingController.addToFollowing
);

FollowingRouter.delete(
  "/remove/:productId",
  auth(["Buyer"]),
  FollowingController.removeFromFollowing
);

FollowingRouter.get(
  "/",
  auth(["Buyer"]),
  FollowingController.getFollowing
);

export default FollowingRouter;
