import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import PairsServices from "./Pairs.service";



const addNewPairsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const files = req.files as Express.Multer.File[];
    // console.log(files);

    const result = await PairsServices.addNewPairsToReseller(user,files, req.body);

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

    const result = await PairsServices.editPairsDetails(user, req.params.id, files, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pairs updated successfully.",
        data: result,
    });
});

const getAllListedPairsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result: any = await PairsServices.getMyListedPairs(user, req.query);

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

    const result = await PairsServices.getSinglePairDetails(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Retrieved pair details.",
        data: result,
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

    const result:any = await PairsServices.getAllPairRequestsForReseller(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Pair requests retrieved successfully.",
        meta: result.meta,
        data:   result.pairs,
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

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Counter offer proposed successfully.",
        data: result,
    });
});

const retailerProposeCounterOfferToPairRequestController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await PairsServices.retailerProposeCounterOfferToPairRequest(user, req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Counter offer proposed successfully.",
        data: result,
    });
});

const PairsController = { 
    addNewPairsController,
    editPairsController,
    getAllListedPairsController,
    getSinglePairDetailsController,

    makeRequestForPairController,
    getAllRetailerPairRequestController,
    retailerProposeCounterOfferToPairRequestController,

    getAllpairRequestController,
    getSinglePairRequestDetails,
    acceptPairRequestController,
    rejectPairRequestController,
    proposeCounterOfferToPairRequestController
 };

export default PairsController;