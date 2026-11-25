import mongoose from "mongoose";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { resolveAnalyticsWindow } from "./Analytics.constant";
import { AnalyticsTrackingSubService } from "./subServices/AnalyticsTrackingSubService";
import { AnalyticsSalesSubService } from "./subServices/AnalyticsSalesSubService";
import { AnalyticsFunnelSubService } from "./subServices/AnalyticsFunnelSubService";
import { AnalyticsProductSubService } from "./subServices/AnalyticsProductSubService";

/**
 * Store Analytics Facade (Module 18): sales, views, order funnel and product performance.
 */
export class AnalyticsFacadeService {
  /**
   * Full store dashboard for ?range=7d|30d|90d|12m in one response.
   */
  static async getStoreOverview(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const retailerId = userDetails.profileId;
    const window = resolveAnalyticsWindow(query.range as string | undefined);

    const [sales, views, funnel, topViewed] = await Promise.all([
      AnalyticsSalesSubService.getSalesSummary(retailerId, window),
      AnalyticsProductSubService.getViewSummary(retailerId, window),
      AnalyticsFunnelSubService.getFunnel(retailerId, window),
      AnalyticsProductSubService.getTopProducts(retailerId, window, { sort: "-views", limit: 5 }),
    ]);

    return {
      range: window.range,
      granularity: window.granularity,
      startDate: window.start,
      endDate: window.end,
      sales,
      views,
      funnel,
      topViewedProducts: topViewed.data,
    };
  }

  static async getTopProducts(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const window = resolveAnalyticsWindow(query.range as string | undefined);
    return await AnalyticsProductSubService.getTopProducts(userDetails.profileId, window, query);
  }

  // --- Internal hooks used by other modules ---
  static recordStoreProfileView(retailerId: string | mongoose.Types.ObjectId) {
    AnalyticsTrackingSubService.recordStoreProfileView(retailerId);
  }

  static recordProductView(
    retailerId: string | mongoose.Types.ObjectId,
    productId: string | mongoose.Types.ObjectId
  ) {
    AnalyticsTrackingSubService.recordProductView(retailerId, productId);
  }

  static async getAveragePrepMinutes(retailerId: string) {
    return await AnalyticsFunnelSubService.getAveragePrepMinutes(retailerId);
  }
}

export default AnalyticsFacadeService;
