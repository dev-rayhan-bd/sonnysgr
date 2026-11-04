import { IJwtPayload } from '../../../interface/jwt.interface';
import { RetailerProfileSubService } from './subServices/RetailerProfileSubService';
import { RetailerGeoSubService } from './subServices/RetailerGeoSubService';
import { RetailerInventorySubService } from './subServices/RetailerInventorySubService';
import { RetailerStoreAdminSubService } from './subServices/RetailerStoreAdminSubService';
import { RetailerOrderSubService } from './subServices/RetailerOrderSubService';
import { RetailerFinancialSubService } from './subServices/RetailerFinancialSubService';

/**
 * Retailer Facade Service: High-Level Orchestrator
 * Coordinates granular sub-services while maintaining ultra-clean, decoupled controllers
 */
export class RetailerFacadeService {
  // --- Profile, Branding & Verification ---
  static async updateProfile(
    userDetails: IJwtPayload,
    profileImage: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    licence: Express.Multer.File | undefined,
    payload: Record<string, any>
  ) {
    return await RetailerProfileSubService.updateProfile(
      userDetails,
      profileImage,
      coverImage,
      licence,
      payload
    );
  }

  static async addVerificationInfo(
    userDetails: IJwtPayload,
    licenseFile: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: Record<string, any>
  ) {
    return await RetailerProfileSubService.addVerificationInfo(
      userDetails,
      licenseFile,
      coverImage,
      payload
    );
  }

  static async completeProfile(
    userDetails: IJwtPayload,
    email: string,
    files: { [fieldname: string]: Express.Multer.File[] } | undefined,
    payload: Record<string, any>
  ) {
    return await RetailerProfileSubService.completeProfile(userDetails, email, files, payload);
  }

  static async toggleOperationHour(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    return await RetailerProfileSubService.toggleOperationHour(userDetails, query);
  }

  // --- Geospatial Scanning & Maps ---
  static async filterNearbyRetailers(query: Record<string, unknown>) {
    return await RetailerGeoSubService.filterNearbyRetailers(query);
  }

  static async getAllNearbyRetailersForMap(query: Record<string, unknown>) {
    return await RetailerGeoSubService.getAllNearbyRetailersForMap(query);
  }

  // --- Inventory & Store Catalog ---
  static async getRetailerInventory(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    return await RetailerInventorySubService.getRetailerInventory(userDetails, query);
  }

  static async getRetailerDetailWithProducts(retailerId: string) {
    return await RetailerInventorySubService.getRetailerDetailWithProducts(retailerId);
  }

  // --- 4-Stage Orders ---
  static async getAllOrdersOfRetailer(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    return await RetailerOrderSubService.getAllOrdersOfRetailer(userDetails, query);
  }

  // --- Admin Store Operations ---
  static async getAllStores(query: Record<string, unknown>) {
    return await RetailerStoreAdminSubService.getAllStores(query);
  }

  static async approveStore(id: string) {
    return await RetailerStoreAdminSubService.approveStore(id);
  }

  // --- Financials & Payouts ---
  static async getFinancialOverview(userDetails: IJwtPayload) {
    return await RetailerFinancialSubService.getFinancialOverview(userDetails);
  }

  static async getPayoutSettings(userDetails: IJwtPayload) {
    return await RetailerFinancialSubService.getPayoutSettings(userDetails);
  }

  static async updatePayoutSettings(userDetails: IJwtPayload, payload: any) {
    return await RetailerFinancialSubService.updatePayoutSettings(userDetails, payload);
  }

  static async requestPayout(userDetails: IJwtPayload, payload: any) {
    return await RetailerFinancialSubService.requestPayout(userDetails, payload);
  }

  static async getPayoutHistory(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await RetailerFinancialSubService.getPayoutHistory(userDetails, query);
  }

  static async adminProcessPayout(payoutId: string, payload: any) {
    return await RetailerFinancialSubService.adminProcessPayout(payoutId, payload);
  }
}

export default RetailerFacadeService;

