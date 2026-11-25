import AnalyticsFacadeService from "./AnalyticsFacadeService";

/**
 * Store Analytics Services Entry Point
 * Proxies calls through AnalyticsFacadeService.
 */
const AnalyticsServices = {
  getStoreOverview: AnalyticsFacadeService.getStoreOverview,
  getTopProducts: AnalyticsFacadeService.getTopProducts,
};

export default AnalyticsServices;
