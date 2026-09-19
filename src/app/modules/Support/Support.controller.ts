import { Request, Response } from "express";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { AuthRequest } from "../../../interface/authRequest";
import SupportServices from "./Support.service";
import ApiError from "../../../error/ApiError";

const createTicket = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await SupportServices.createTicket(user.profileId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Support ticket created successfully.",
    data: result,
  });
});

const getPresignedUrl = catchAsync(async (req: Request, res: Response) => {
  const { fileName, fileType } = req.query;

  if (!fileName || !fileType) {
    throw new ApiError(400, "fileName and fileType query parameters are required");
  }

  const result = await SupportServices.getPresignedUrlService(
    fileName as string,
    fileType as string
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pre-signed URL generated successfully.",
    data: result,
  });
});

const getTicketsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportServices.getTicketsAdmin(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Support tickets fetched successfully.",
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
      totalPage: Math.ceil(result.meta.total / result.meta.limit),
    },
    data: result.data,
  });
});

const resolveTicket = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const { ticketId } = req.params;

  const result = await SupportServices.resolveTicket(ticketId as string, user.profileId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Support ticket resolved successfully.",
    data: result,
  });
});

const SupportController = {
  createTicket,
  getPresignedUrl,
  getTicketsAdmin,
  resolveTicket,
};

export default SupportController;
