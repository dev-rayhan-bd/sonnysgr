import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import SubscriptionPaymentServices from "./SubscriptionPayment.service";

const triggerStripePayment = catchAsync(async (req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment initiated",
    data: null,
  });
});

export const SubscriptionPaymentController = {
  triggerStripePayment,
};

export default SubscriptionPaymentController;
