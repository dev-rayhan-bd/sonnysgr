import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import DemandServices from "./Demand.service";

const getLocalDemand = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { radius, startDate, endDate } = req.query as any;

  const result = await DemandServices.getLocalDemandService(
    user.profileId,
    {
      radius: Number(radius),
      startDate,
      endDate,
    }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Local demand retrieved successfully.",
    data: result,
  });
});

const getSizeDemand = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { productId } = req.params;
  const { radius, startDate, endDate } = req.query as any;

  const result = await DemandServices.getSizeDemandService(
    user.profileId,
    productId,
    {
      radius: Number(radius),
      startDate,
      endDate,
    }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Size demand for the product retrieved successfully.",
    data: result,
  });
});

const getDemandGaps = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { radius, startDate, endDate } = req.query as any;

  const result = await DemandServices.getDemandGapsService(
    user.profileId,
    {
      radius: Number(radius),
      startDate,
      endDate,
    }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Demand gaps retrieved successfully.",
    data: result,
  });
});

export const DemandController = {
  getLocalDemand,
  getSizeDemand,
  getDemandGaps,
};
export default DemandController;
