import { Request, Response } from "express";
import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import OrderPaymentCheckoutServices from "./OrderPaymentCheckout.service";

const placeOrder = catchAsync(async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  const result = await OrderPaymentCheckoutServices.paymentCheckoutService({
    buyerId: user.profileId,
    ...req.body,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order placed successfully.",
    data: result.data,
  });
});

export const OrderPaymentController = {
  placeOrder,
};

export default OrderPaymentController;
