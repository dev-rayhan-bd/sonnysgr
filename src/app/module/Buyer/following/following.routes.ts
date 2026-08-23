import express from "express";
import { auth } from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
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
