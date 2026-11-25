import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import ProductValidations from "./Product.validation";
import ProductController from "./Product.controller";
import { check } from "zod/v4/mini";
import { uploadProductImage } from "../../middleware/multerMiddleware";


const ProductRouter = express.Router();

ProductRouter.post(
    "/add-new-product",
    authorizeUser,
    uploadProductImage.array("product-image", 8),
    // validateRequest(ProductValidations.addNewProductValidation),
    ProductController.addProductController
);

ProductRouter.patch(
    "/edit-product/:id",
    authorizeUser,
    uploadProductImage.array("product-image", 8),
    ProductController.editProductController
);

ProductRouter.delete(
    "/delete-product/:id",
    authorizeUser,
    // uploadProductImage.array("product-image",8),
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
    "/get-all-products",
    authorizeUser,
    ProductController.getAllProductsController
);

ProductRouter.get(
    "/get-product-detail/:id",
    ProductController.getProductDetailByIdController
);

// --- Barcode scanner (retailer in-store tool) ---
ProductRouter.get(
    "/lookup-barcode/:barcode",
    auth(["Retailer"]),
    validateRequest(ProductValidations.lookupBarcodeValidation),
    ProductController.lookupBarcodeController
);

ProductRouter.post(
    "/scan-restock",
    auth(["Retailer"]),
    validateRequest(ProductValidations.scanRestockValidation),
    ProductController.scanRestockController
);

ProductRouter.patch(
    "/assign-barcode",
    auth(["Retailer"]),
    validateRequest(ProductValidations.assignBarcodeValidation),
    ProductController.assignBarcodeController
);

ProductRouter.delete(
    "/delete-recent-search/:id",
    authorizeUser,
    ProductController.deleteRecentSearchController
);

export default ProductRouter;




