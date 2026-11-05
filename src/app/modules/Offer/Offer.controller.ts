import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import OfferFacadeService from "./OfferFacadeService";

const sendOffer = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const result = await OfferFacadeService.sendOffer(user, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Purchase offer submitted successfully.",
    data: result,
  });
});

const withdrawOffer = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const result = await OfferFacadeService.withdrawOffer(user, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Offer withdrawn successfully.",
    data: result,
  });
});

const counterOffer = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const result = await OfferFacadeService.counterOffer(user, id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Counter-offer submitted successfully.",
    data: result,
  });
});

const acceptOffer = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const result = await OfferFacadeService.acceptOffer(user, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Offer accepted successfully. In-store drop-off code generated.",
    data: result,
  });
});

const declineOffer = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;
  const { reason } = req.body;

  const result = await OfferFacadeService.declineOffer(user, id, reason);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Offer declined successfully.",
    data: result,
  });
});

const verifyDropoffAndSettle = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await OfferFacadeService.verifyDropoffAndSettle(user, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result.settlement,
  });
});

const getMySentOffers = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await OfferFacadeService.getMySentOffers(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved submitted offers successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getInboundOffers = catchAsync(async (req, res) => {
  const { user } = req as AuthRequest;

  const result = await OfferFacadeService.getInboundOffers(user, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved inbound purchase offers successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getOfferDetailsById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await OfferFacadeService.getOfferDetailsById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrieved offer details successfully.",
    data: result,
  });
});

export const OfferController = {
  sendOffer,
  withdrawOffer,
  counterOffer,
  acceptOffer,
  declineOffer,
  verifyDropoffAndSettle,
  getMySentOffers,
  getInboundOffers,
  getOfferDetailsById,
};

export default OfferController;
