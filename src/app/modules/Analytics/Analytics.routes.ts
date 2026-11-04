import express from "express";
import {auth} from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import AnalyticsValidations from "./Analytics.validation";
import AnalyticsController from "./Analytics.controller";


const AnalyticsRouter = express.Router();



export default AnalyticsRouter;