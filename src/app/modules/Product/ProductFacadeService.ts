import { IJwtPayload } from '../../../interface/jwt.interface';
import { ProductCommandSubService } from './subServices/ProductCommandSubService';
import { ProductCatalogSubService } from './subServices/ProductCatalogSubService';
import { ProductSearchSubService } from './subServices/ProductSearchSubService';
import { ProductInventorySubService } from './subServices/ProductInventorySubService';
import { ProductBarcodeSubService } from './subServices/ProductBarcodeSubService';
import AnalyticsFacadeService from '../Analytics/AnalyticsFacadeService';

/**
 * Product Facade Service: High-Level Orchestrator
 * Coordinates product creation, catalog feeds, full-text search and stock modifications
 */
export class ProductFacadeService {
  // --- Creation, Editing & Deletion ---
  static async addProduct(
    userDetails: IJwtPayload,
    files: Express.Multer.File[],
    payload: any
  ) {
    return await ProductCommandSubService.addProduct(userDetails, files, payload);
  }

  static async editProduct(
    userDetails: IJwtPayload,
    productId: string,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    return await ProductCommandSubService.editProduct(userDetails, productId, files, payload);
  }

  static async deleteProduct(userDetails: IJwtPayload, productId: string) {
    return await ProductCommandSubService.deleteProduct(userDetails, productId);
  }

  // --- Catalog & Relational Feeds ---
  static async getAllProducts(query: Record<string, unknown>) {
    return await ProductCatalogSubService.getAllProducts(query);
  }

  static async getProductDetailById(productId: string) {
    const product = await ProductCatalogSubService.getProductDetailById(productId);

    // Module 18.2: count the view for the owning store's analytics (non-blocking)
    if (product?.retailer?._id) {
      AnalyticsFacadeService.recordProductView(product.retailer._id, product._id);
    }

    return product;
  }

  // --- Search & Trending ---
  static async searchProducts(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    return await ProductSearchSubService.searchProducts(userDetails, query);
  }

  static async getTrendingNowAndRecentSearches(userDetails: IJwtPayload) {
    return await ProductSearchSubService.getTrendingNowAndRecentSearches(userDetails);
  }

  static async deleteRecentSearch(userDetails: IJwtPayload, searchId: string) {
    return await ProductSearchSubService.deleteRecentSearch(userDetails, searchId);
  }

  // --- Inventory & Stock ---
  static async adjustSizeStock(
    productId: string,
    size: string,
    quantityChange: number,
    reserveChange?: number
  ) {
    return await ProductInventorySubService.adjustSizeStock(
      productId,
      size,
      quantityChange,
      reserveChange
    );
  }

  // --- Barcode scanner (retailer) ---
  static async lookupBarcode(userDetails: IJwtPayload, barcode: string) {
    return await ProductBarcodeSubService.lookupBarcode(userDetails, barcode);
  }

  static async scanRestock(userDetails: IJwtPayload, payload: { barcode: string; quantity?: number }) {
    return await ProductBarcodeSubService.scanRestock(userDetails, payload);
  }

  static async assignBarcode(
    userDetails: IJwtPayload,
    payload: { productId: string; size: string; barcode: string }
  ) {
    return await ProductBarcodeSubService.assignBarcode(userDetails, payload);
  }

  static async toggleAvailability(
    userDetails: IJwtPayload,
    productId: string,
    availability: string
  ) {
    return await ProductInventorySubService.toggleAvailability(
      userDetails,
      productId,
      availability
    );
  }
}

export default ProductFacadeService;
