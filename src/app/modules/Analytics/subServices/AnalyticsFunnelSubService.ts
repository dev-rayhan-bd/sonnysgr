import mongoose from "mongoose";
import { OrderItemModel } from "../../Order/Order.model";
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_TYPE } from "../../../../utilities/enum";
import { RetailerStoreSettingsSubService } from "../../Retailer/subServices/RetailerStoreSettingsSubService";
import { IAnalyticsWindow } from "../Analytics.interface";

// Statuses that prove an item reached the shelf ready for collection (incl. legacy strings)
const REACHED_READY_STATUSES = [
  ENUM_ORDER_ITEM_STATUS.READY_FOR_PICKUP,
  ENUM_ORDER_ITEM_STATUS.COMPLETED,
  "Ready",
  "Ready_For_Pickup",
];

const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/**
 * Sub-Service dedicated to the store order funnel (Module 18.3):
 * average prep time, pickup completion rate and hold conversion rate.
 */
export class AnalyticsFunnelSubService {
  static async getFunnel(retailerId: string, window: IAnalyticsWindow) {
    const COMPLETED = ENUM_ORDER_ITEM_STATUS.COMPLETED;

    const [[result], settings] = await Promise.all([
      OrderItemModel.aggregate([
        {
          $match: {
            retailerId: new mongoose.Types.ObjectId(retailerId),
            createdAt: { $gte: window.start, $lte: window.end },
          },
        },
        {
          $lookup: {
            from: "orders",
            let: { orderId: "$orderId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$orderId"] } } },
              { $project: { orderType: 1 } },
            ],
            as: "order",
          },
        },
        { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
        {
          $facet: {
            statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            prep: [
              { $match: { readyAt: { $ne: null } } },
              {
                $group: {
                  _id: null,
                  avgMs: {
                    $avg: {
                      $subtract: ["$readyAt", { $ifNull: ["$acceptedAt", "$createdAt"] }],
                    },
                  },
                  samples: { $sum: 1 },
                },
              },
            ],
            pickup: [
              { $match: { "order.orderType": { $ne: ENUM_ORDER_TYPE.HOLD } } },
              {
                $match: {
                  $or: [{ readyAt: { $ne: null } }, { status: { $in: REACHED_READY_STATUSES } }],
                },
              },
              {
                $group: {
                  _id: null,
                  reachedReady: { $sum: 1 },
                  pickedUp: { $sum: { $cond: [{ $eq: ["$status", COMPLETED] }, 1, 0] } },
                },
              },
            ],
            holds: [
              { $match: { "order.orderType": ENUM_ORDER_TYPE.HOLD } },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  converted: { $sum: { $cond: [{ $eq: ["$status", COMPLETED] }, 1, 0] } },
                  active: {
                    $sum: { $cond: [{ $eq: ["$status", ENUM_ORDER_ITEM_STATUS.HOLDING] }, 1, 0] },
                  },
                  lost: {
                    $sum: {
                      $cond: [{ $eq: ["$status", ENUM_ORDER_ITEM_STATUS.CANCELLED] }, 1, 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ]),
      RetailerStoreSettingsSubService.getSettingsInternal(retailerId),
    ]);

    const prep = result?.prep?.[0];
    const pickup = result?.pickup?.[0] || { reachedReady: 0, pickedUp: 0 };
    const holds = result?.holds?.[0] || { total: 0, converted: 0, active: 0, lost: 0 };
    const statusBreakdown = Object.fromEntries(
      (result?.statusCounts || []).map((row: { _id: string; count: number }) => [row._id, row.count])
    );

    return {
      prepTime: {
        averageMinutes: prep ? Math.round(prep.avgMs / 60000) : null,
        targetMinutes: settings.prepTimeMinutes,
        samples: prep?.samples || 0,
      },
      pickup: {
        readyForPickup: pickup.reachedReady,
        pickedUp: pickup.pickedUp,
        completionRate: rate(pickup.pickedUp, pickup.reachedReady),
      },
      holds: {
        total: holds.total,
        converted: holds.converted,
        active: holds.active,
        lost: holds.lost,
        // conversion over resolved holds only (active holds are still undecided)
        conversionRate: rate(holds.converted, holds.converted + holds.lost),
      },
      statusBreakdown,
    };
  }

  /**
   * Lifetime average prep time in minutes (null when the store has no ready samples yet).
   * Used by the retailer order dashboard header ("Avg. prep 8 min").
   */
  static async getAveragePrepMinutes(retailerId: string): Promise<number | null> {
    const [row] = await OrderItemModel.aggregate([
      { $match: { retailerId: new mongoose.Types.ObjectId(retailerId), readyAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgMs: { $avg: { $subtract: ["$readyAt", { $ifNull: ["$acceptedAt", "$createdAt"] }] } },
        },
      },
    ]);
    return row ? Math.round(row.avgMs / 60000) : null;
  }
}
