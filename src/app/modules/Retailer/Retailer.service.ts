import RetailerFacadeService from './RetailerFacadeService';

/**
 * Retailer Services Entry Point
 * Proxies calls through RetailerFacadeService for clean architectural decoupling
 */
const filterNearbyRetailers = RetailerFacadeService.filterNearbyRetailers;
const getAllNearbyRetailersForMap = RetailerFacadeService.getAllNearbyRetailersForMap;
const getRetailerDetailWithProduct = RetailerFacadeService.getRetailerDetailWithProducts;
const getRetailerInventory = RetailerFacadeService.getRetailerInventory;
const getAllOrdersOfRetailer = RetailerFacadeService.getAllOrdersOfRetailer;
const toggleOperationHour = RetailerFacadeService.toggleOperationHour;
const updateRetailerProfileService = RetailerFacadeService.updateProfile;
const addRetailerLicense = RetailerFacadeService.addVerificationInfo;
const completeRetailerProfileService = RetailerFacadeService.completeProfile;
const getAllRetailerStoreService = RetailerFacadeService.getAllStores;
const approveRetailerService = RetailerFacadeService.approveStore;
const getFinancialOverview = RetailerFacadeService.getFinancialOverview;
const getPayoutSettings = RetailerFacadeService.getPayoutSettings;
const updatePayoutSettings = RetailerFacadeService.updatePayoutSettings;
const requestPayout = RetailerFacadeService.requestPayout;
const getPayoutHistory = RetailerFacadeService.getPayoutHistory;
const adminProcessPayout = RetailerFacadeService.adminProcessPayout;

const RetailerServices = {
  filterNearbyRetailers,
  getAllNearbyRetailersForMap,
  getRetailerDetailWithProduct,
  getRetailerInventory,
  getAllOrdersOfRetailer,
  toggleOperationHour,
  updateRetailerProfileService,
  addRetailerLicense,
  completeRetailerProfileService,
  getAllRetailerStoreService,
  approveRetailerService,
  getFinancialOverview,
  getPayoutSettings,
  updatePayoutSettings,
  requestPayout,
  getPayoutHistory,
  adminProcessPayout,
};

export default RetailerServices;
export { RetailerFacadeService };
