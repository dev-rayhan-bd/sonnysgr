import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import LockerFacadeService from "./LockerFacadeService";

const addSneakerToLocker = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const files = req.files as Express.Multer.File[] | undefined;

  const result = await LockerFacadeService.addSneakerToLocker(user, files, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Sneaker added to locker successfully.",
    data: result,
  });
});

const updateLockerItem = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const files = req.files as Express.Multer.File[] | undefined;
  const { id } = req.params;

  const result = await LockerFacadeService.updateLockerItem(user, id, files, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Locker sneaker updated successfully.",
    data: result,
  });
});

const toggleLockerPrivacy = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;
  const { isPublic } = req.body;

  const result = await LockerFacadeService.toggleLockerPrivacy(
    user,
    id,
    isPublic === "true" || isPublic === true
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Locker item privacy set to ${result.isPublic ? "Public" : "Private"}.`,
    data: result,
  });
});

const deleteLockerItem = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const result = await LockerFacadeService.deleteLockerItem(user, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Sneaker removed from locker successfully.",
    data: result,
  });
});

const getMyLocker = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await LockerFacadeService.getMyLocker(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved personal sneaker locker successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleLockerItem = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await LockerFacadeService.getSingleLockerItem(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved locker sneaker details successfully.",
    data: result,
  });
});

const getNearbyCommunityLockers = catchAsync(async (req, res) => {
  const result = await LockerFacadeService.getNearbyCommunityLockers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved nearby community lockers successfully.",
    meta: result.meta,
    data: result.data,
  });
});

export const LockerController = {
  addSneakerToLocker,
  updateLockerItem,
  toggleLockerPrivacy,
  deleteLockerItem,
  getMyLocker,
  getSingleLockerItem,
  getNearbyCommunityLockers,
};

export default LockerController;

