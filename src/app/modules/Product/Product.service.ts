import ProductFacadeService from './ProductFacadeService';

/**
 * Product Services Entry Point
 * Proxies calls through ProductFacadeService for clean architectural decoupling
 */
const addProductService = ProductFacadeService.addProduct;
const editProductService = ProductFacadeService.editProduct;
const deleteProductService = ProductFacadeService.deleteProduct;
const getAllProductsService = ProductFacadeService.getAllProducts;
const getProductDetailByIdService = ProductFacadeService.getProductDetailById;
const getProductDetailsByIdService = ProductFacadeService.getProductDetailById;
const searchProductsService = ProductFacadeService.searchProducts;
const getTrendingNowAndRecentSearchesService = ProductFacadeService.getTrendingNowAndRecentSearches;
const getTrendingNowAndRecentSearchesSevice = ProductFacadeService.getTrendingNowAndRecentSearches;
const deleteRecentSearchService = ProductFacadeService.deleteRecentSearch;
const adjustSizeStock = ProductFacadeService.adjustSizeStock;
const toggleAvailability = ProductFacadeService.toggleAvailability;
const lookupBarcodeService = ProductFacadeService.lookupBarcode;
const scanRestockService = ProductFacadeService.scanRestock;
const assignBarcodeService = ProductFacadeService.assignBarcode;

const ProductServices = {
  addProductService,
  editProductService,
  deleteProductService,
  getAllProductsService,
  getProductDetailByIdService,
  getProductDetailsByIdService,
  searchProductsService,
  getTrendingNowAndRecentSearchesService,
  getTrendingNowAndRecentSearchesSevice,
  deleteRecentSearchService,
  adjustSizeStock,
  toggleAvailability,
  lookupBarcodeService,
  scanRestockService,
  assignBarcodeService,
};

export default ProductServices;
export { ProductFacadeService };
