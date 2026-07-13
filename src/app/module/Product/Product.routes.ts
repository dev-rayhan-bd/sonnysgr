import express from "express";
import {auth, authorizeUser} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import ProductValidations from "./Product.validation";
import ProductController from "./Product.controller";
import { check } from "zod/v4/mini";
import { uploadProfile } from "../../middlewares/multerMiddleware";


const ProductRouter = express.Router();

ProductRouter.post(
    "/add-new-product",
    authorizeUser,
    // uploadProfile.array("product-image",8),
    validateRequest(ProductValidations.addNewProductValidation),
    ProductController.addProductController
);

ProductRouter.patch(
    "/edit-product/:id",
    authorizeUser,
    uploadProfile.array("product-image",8),
    // validateRequest(ProductValidations.addNewProductValidation),
    ProductController.editProductController
);

ProductRouter.delete(
    "/delete-product/:id",
    authorizeUser,
    // uploadProfile.array("product-image",8),
    // validateRequest(ProductValidations.addNewProductValidation),
    ProductController.deleteProductController
);

ProductRouter.get(
    "/search-product",
    authorizeUser,
    // validateRequest(ProductValidations.searchProductsZodSchema, "query"),
    ProductController.searchProductsController
);

ProductRouter.get(
    "/trending-and-recent-searches",
    authorizeUser,
    ProductController.getTrendingNowAndRecentSearchesController
);

ProductRouter.get(
    "/get-product-detail/:id",
    ProductController.getProductDetailByIdController
);

ProductRouter.delete(
    "/delete-recent-search/:id",
    authorizeUser,
    ProductController.deleteRecentSearchController
);

export default ProductRouter;


// check out : 5:22 PM

// Today worked on new feature development scope and also attended meeting for clarification.

// Also checked Binksanders(micro learning platform) project’s working flow and attended meeting to clarify client's recent feedback. 

// project : Sneaker Hub 
// git: https://github.com/SoubirSaian/sneaker-hub-backend
// Today checked some already build api in postman

