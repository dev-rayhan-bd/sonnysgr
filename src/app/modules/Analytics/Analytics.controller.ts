import { StatusCodes } from "http-status-codes";
import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import AnalyticsServices from "./Analytics.service";

const getStoreOverview = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await AnalyticsServices.getStoreOverview(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Store analytics retrieved successfully.",
    data: result,
  });
});

const getTopProducts = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await AnalyticsServices.getTopProducts(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product performance retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const AnalyticsController = {
  getStoreOverview,
  getTopProducts,
};

export default AnalyticsController;
