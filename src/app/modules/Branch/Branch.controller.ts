import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { BranchServices } from "./Branch.service";

const createBranch = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const profileImage = files?.["profile-image"]?.[0];
  const coverImage = files?.["cover-image"]?.[0];

  if (req.body.operationHours && typeof req.body.operationHours === "string") {
    try {
      req.body.operationHours = JSON.parse(req.body.operationHours);
    } catch {
      // keep raw if not JSON
    }
  }

  const result = await BranchServices.createBranchInDB(
    user,
    profileImage,
    coverImage,
    req.body,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Branch created successfully.",
    data: result,
  });
});

const updateBranch = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const profileImage = files?.["profile-image"]?.[0];
  const coverImage = files?.["cover-image"]?.[0];

  if (req.body.operationHours && typeof req.body.operationHours === "string") {
    try {
      req.body.operationHours = JSON.parse(req.body.operationHours);
    } catch {
      // keep raw
    }
  }

  const result = await BranchServices.updateBranchInDB(
    user,
    id,
    profileImage,
    coverImage,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Branch updated successfully.",
    data: result,
  });
});

const deleteBranch = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const result = await BranchServices.deleteBranchFromDB(user, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Branch deleted successfully.",
    data: result,
  });
});

const getMyBranches = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await BranchServices.getRetailerBranches(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved branches successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleBranch = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const result = await BranchServices.getSingleBranch(user, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved branch details successfully.",
    data: result,
  });
});

const getBranchSwitcherFeed = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await BranchServices.getBranchSwitcherFeed(user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved branch switcher feed successfully.",
    data: result,
  });
});

const getAllBranchesForAdmin = catchAsync(async (req, res) => {
  const result = await BranchServices.getAllBranchesForAdmin(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved all branches successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleBranchForAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await BranchServices.getSingleBranchForAdmin(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved branch details successfully.",
    data: result,
  });
});

export const BranchController = {
  createBranch,
  updateBranch,
  deleteBranch,
  getMyBranches,
  getSingleBranch,
  getBranchSwitcherFeed,
  getAllBranchesForAdmin,
  getSingleBranchForAdmin,
};
