import express from "express";
import {auth} from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import OldPairValidations from "./OldPair.validation";
import OldPairController from "./OldPair.controller";


const OldPairRouter = express.Router();



export default OldPairRouter;