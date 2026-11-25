import express from "express";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { auth } from "../../../middleware/auth";
import validateRequest from "../../../middleware/validateRequest";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import { ADMIN_ROLES } from "../dashboard.shared";
import AdminSearchService from "./adminSearch.service";

const adminSearchValidation = z.object({
  query: z.object({
    searchTerm: z.string().trim().min(1, "searchTerm is required"),
    limit: z.coerce.number().int().positive().max(20).optional(),
  }),
});

const globalSearch = catchAsync(async (req, res) => {
  const result = await AdminSearchService.globalSearch(req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Search results retrieved successfully.", data: result });
});

const adminSearchRouter = express.Router();

adminSearchRouter.get("/", auth(ADMIN_ROLES), validateRequest(adminSearchValidation), globalSearch);

export default adminSearchRouter;
