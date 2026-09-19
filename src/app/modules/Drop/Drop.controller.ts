import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import DropServices from "./Drop.service";

const createDropController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const files = req.files as Express.Multer.File[];
  const result = await DropServices.createDropService(user, files, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Drop created successfully",
    data: result,
  });
});

const editDropController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const files = req.files as Express.Multer.File[];
  const result = await DropServices.editDropService(user, req.params.id, files, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Drop updated successfully",
    data: result,
  });
});

const deleteDropController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await DropServices.deleteDropService(user, req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Drop deleted successfully",
    data: result,
  });
});

const getDropController = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await DropServices.getDropService(user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Drop retrieved successfully",
    data: result,
  });
});

const DropController = {
  createDropController,
  editDropController,
  deleteDropController,
  getDropController,
};

export default DropController;
