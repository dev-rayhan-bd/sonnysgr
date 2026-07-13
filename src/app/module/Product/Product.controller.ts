import { AuthRequest } from "../../../interface/authRequest";
import catchAsync from "../../../utilities/catchasync";
import sendResponse from "../../../utilities/sendResponse";
import ProductServices from "./Product.service";

const addProductController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const files = req.files as Express.Multer.File[];
    // console.log(req.body);
    const result = await ProductServices.addProductService(user,files,req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Product added successfully",
        data: result,
    });
});

const editProductController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const files = req.files as Express.Multer.File[];
    // console.log(req.body);
    const result = await ProductServices.editProductService(user,req.params.id,files,req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Product updated.",
        data: result,
    });
});

const deleteProductController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    // console.log(req.body);
    const result = await ProductServices.deleteProductService(user,req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Product deleted.",
        data: result,
    });
});



const searchProductsController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await ProductServices.searchProductsService(user, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Products searched successfully",
        data: result,
    });
});

const getTrendingNowAndRecentSearchesController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await ProductServices.getTrendingNowAndRecentSearchesSevice(user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Trending products and recent searches retrieved successfully",
        data: result,
    });
});

const getProductDetailByIdController = catchAsync(async (req, res) => {

    const result = await ProductServices.getProductDetailsByIdService(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Product detail retrieved successfully",
        data: result,
    });
});

const deleteRecentSearchController = catchAsync(async (req, res) => {

    const { user } = req as AuthRequest;

    const result = await ProductServices.deleteRecentSearchService(user, req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Recent search deleted successfully",
        data: result,
    });
});

const ProductController = { 
    addProductController,
    editProductController,
    deleteProductController,
    searchProductsController,
    getTrendingNowAndRecentSearchesController,
    getProductDetailByIdController,
    deleteRecentSearchController
 };

export default ProductController;