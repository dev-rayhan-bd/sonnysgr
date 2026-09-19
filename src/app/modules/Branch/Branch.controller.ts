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

  if (req.body.operationHours) {
    req.body.operationHours = JSON.parse(req.body.operationHours);
  }

  // if (req.body.pickupRules) {
  //   req.body.pickupRules = JSON.parse(req.body.pickupRules);
  // }

  // if (req.body.branchSettings) {
  //   req.body.branchSettings = JSON.parse(req.body.branchSettings);
  // }

  console.log(typeof req.body.operationHours); // object
  console.log(Array.isArray(req.body.operationHours)); // true
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
  getAllBranchesForAdmin,
  getSingleBranchForAdmin,
};
