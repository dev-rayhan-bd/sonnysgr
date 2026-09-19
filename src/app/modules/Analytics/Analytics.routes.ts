import express from "express";
import {auth} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import AnalyticsValidations from "./Analytics.validation";
import AnalyticsController from "./Analytics.controller";


const AnalyticsRouter = express.Router();



export default AnalyticsRouter;