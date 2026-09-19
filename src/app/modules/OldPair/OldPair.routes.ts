import express from "express";
import {auth} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import OldPairValidations from "./OldPair.validation";
import OldPairController from "./OldPair.controller";


const OldPairRouter = express.Router();



export default OldPairRouter;