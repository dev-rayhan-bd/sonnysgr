import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import OrderServices from "./Order.service";



const getRetailerHomePageOrderStatDataController = catchAsync(async (req, res) => {

    const {user} = req as AuthRequest;

    const result = await OrderServices.getRetailerHomePageOrderStatDataService(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved retailer home page order stat data.",
        data: result,
    });
});

const getOrderDetailController = catchAsync(async (req, res) => {

    // const {user} = req as AuthRequest;

    const result = await OrderServices.getOrderDetailsById(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved order detail.",
        data: result,
    });
});

const retailerAcceptOrder = catchAsync(async (req, res) => {

    const {user} = req as AuthRequest;

    const result = await OrderServices.retailerAcceptOrderService(user,req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Order Accepted.",
        data: result,
    });
});

const OrderController = { 
    getRetailerHomePageOrderStatDataController,
    getOrderDetailController,
    retailerAcceptOrder,
};

export default OrderController;