import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import PaymentServices from "./Payment.service";

const u = catchAsync(async (req, res) => {

    // const result = await PaymentServices.u();

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "P",
        data: null,
    });
});

const PaymentController = { 

 };

export default PaymentController;