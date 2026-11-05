import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import { PairsFacadeService } from "./PairsFacadeService";
import PairsServices from "./Pairs.service";



const addNewPairsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const files = req.files as Express.Multer.File[];
    // console.log(files);

    const result = await PairsFacadeService.addNewPairs(user, files, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "New pairs added successfully.",
        data: result,
    });
});

const editPairsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const files = req.files as Express.Multer.File[];

    const id = req.params.id as string;
    const result = await PairsFacadeService.editPairs(user, id, files, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pairs updated successfully.",
        data: result,
    });
});

const getAllListedPairsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result: any = await PairsFacadeService.getMyListedPairs(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Listed pairs retrieved successfully.",
        meta: result.meta,
        data: result.pairs,
    });
});

const getSinglePairDetailsController = catchAsync(async (req, res) => {

    // const { user } = req as AuthRequest;

    const id = req.params.id as string;
    const result = await PairsFacadeService.getSinglePairDetails(id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved pair details.",
        data: result,
    });
});

const browseB2BPairsController = catchAsync(async (req, res) => {
    const result = await PairsFacadeService.browseB2BPairs(req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "B2B reseller pairs retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const makeRequestForPairController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await PairsServices.makeRequestForPairService(user, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Pair request submitted successfully.",
        data: result,
    });
});

const getAllRetailerPairRequestController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await PairsServices.getAllPairRequestsForRetailer(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pair requests retrieved successfully.",
        data: result,
    });
});

//reseller

const getAllpairRequestController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result: any = await PairsServices.getAllPairRequestsForReseller(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pair requests retrieved successfully.",
        meta: result.meta,
        data: result.pairs,
    });
});

const getSinglePairRequestDetails = catchAsync(async (req, res) => {

    // const { user } = req as AuthRequest;

    const result = await PairsServices.getSInglePairRequestService(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved a pair requests details.",
        data: result,
    });
});

const acceptPairRequestController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await PairsServices.acceptPairRequest(user, req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pair request accepted successfully.",
        data: result,
    });
});

const cancelPairRequestController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await PairsServices.cancelPairRequest(user, req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pair request cancelled successfully.",
        data: result,
    });
});

const rejectPairRequestController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await PairsServices.rejectPairRequest(user, req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pair request rejected successfully.",
        data: result,
    });
});

const proposeCounterOfferToPairRequestController = catchAsync(async (req, res) => {
    const { user } = req as AuthRequest;

    const result = await PairsServices.proposeCounterOfferToPairRequest(user, req.body);

    const message = result && (result as any).message 
        ? (result as any).message 
        : "Counter offer proposed successfully.";

    const data = result && (result as any).productRequest 
        ? (result as any).productRequest 
        : result;

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message,
        data,
    });
});

const retailerProposeCounterOfferToPairRequestController = catchAsync(async (req, res) => {
    const { user } = req as AuthRequest;

    const result = await PairsServices.retailerProposeCounterOfferToPairRequest(user, req.body);

    const message = result && (result as any).message 
        ? (result as any).message 
        : "Counter offer proposed successfully.";

    const data = result && (result as any).productRequest 
        ? (result as any).productRequest 
        : result;

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message,
        data,
    });
});

const createProductRequestController = catchAsync(async (req, res) => {
    const { user } = req as AuthRequest;
    const files = req.files as Express.Multer.File[];

    const result = await PairsServices.createProductRequest(user, files, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Product request created successfully.",
        data: result,
    });
});

const getProductRequestsController = catchAsync(async (req, res) => {
    const { user } = req as AuthRequest;

    const result = await PairsServices.getAllProductRequests(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: result.productRequests.length === 0
            ? "You have no request right now."
            : "Product requests retrieved successfully.",
        meta: result.meta,
        data: result.productRequests,
    });
});

const updateProductRequestStatusController = catchAsync(async (req, res) => {
    const { user } = req as AuthRequest;
    const { id } = req.params;

    const result = await PairsServices.updateProductRequestStatus(user, id, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: `Product request status updated to ${req.body.status} successfully.`,
        data: result,
    });
});

const PairsController = {
    addNewPairsController,
    editPairsController,
    getAllListedPairsController,
    getSinglePairDetailsController,
    browseB2BPairsController,

    makeRequestForPairController,
    getAllRetailerPairRequestController,
    retailerProposeCounterOfferToPairRequestController,

    getAllpairRequestController,
    getSinglePairRequestDetails,
    acceptPairRequestController,
    cancelPairRequestController,
    rejectPairRequestController,
    proposeCounterOfferToPairRequestController,
    createProductRequestController,
    getProductRequestsController,
    updateProductRequestStatusController
};

export default PairsController;