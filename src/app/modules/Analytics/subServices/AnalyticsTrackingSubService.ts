import mongoose from "mongoose";
import StoreDailyAnalyticsModel from "../Analytics.model";
import { startOfUtcDay } from "../Analytics.constant";

type TObjectIdLike = string | mongoose.Types.ObjectId;

/**
 * Sub-Service dedicated to recording store / product views (Module 18.2).
 * Writes are atomic upserts on a per-day counter document and never block the caller.
 */
export class AnalyticsTrackingSubService {
  /** A buyer opened the store profile */
  static recordStoreProfileView(retailerId: TObjectIdLike) {
    AnalyticsTrackingSubService.increment(retailerId, null, "profileViews");
  }

  /** A buyer opened a product detail page */
  static recordProductView(retailerId: TObjectIdLike, productId: TObjectIdLike) {
    AnalyticsTrackingSubService.increment(retailerId, productId, "productViews");
  }

  private static increment(
    retailerId: TObjectIdLike,
    productId: TObjectIdLike | null,
    field: "profileViews" | "productViews"
  ) {
    if (!mongoose.Types.ObjectId.isValid(String(retailerId))) return;
    if (productId && !mongoose.Types.ObjectId.isValid(String(productId))) return;

    StoreDailyAnalyticsModel.updateOne(
      {
        retailerId: new mongoose.Types.ObjectId(String(retailerId)),
        productId: productId ? new mongoose.Types.ObjectId(String(productId)) : null,
        date: startOfUtcDay(),
      },
      { $inc: { [field]: 1 } },
      { upsert: true }
    ).catch((error: unknown) => {
      // Analytics must never break the page being viewed; log and continue
      console.error(`[Analytics] failed to record ${field}:`, error);
    });
  }
}
