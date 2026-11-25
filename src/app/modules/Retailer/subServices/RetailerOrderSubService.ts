import mongoose from 'mongoose';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel } from '../../Order/Order.model';
import { getRetailerStageStatusFilter } from '../../Order/Order.constant';
import { AnalyticsFunnelSubService } from '../../Analytics/subServices/AnalyticsFunnelSubService';
import { RetailerStoreSettingsSubService } from './RetailerStoreSettingsSubService';

/**
 * Sub-Service dedicated to Retailer Orders & 4-Stage Lifecycle queries
 */
export class RetailerOrderSubService {
  /**
   * Get retailer orders grouped by stages: Needs Action, Holds, Ready, History
   * Uses native MongoDB Aggregation ($lookup + $facet)
   */
  static async getAllOrdersOfRetailer(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;
    const stage = (query.stage || query.orderStatus || 'Needs Action') as string;

    const retailerObjectId = new mongoose.Types.ObjectId(profileId);

    // Map UI stages to status filters
    const statusFilter = getRetailerStageStatusFilter(stage);

    const pipeline: any[] = [
      {
        $match: {
          retailerId: retailerObjectId,
          ...statusFilter,
        },
      },
      // Join Product info
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      // Join Buyer info
      {
        $lookup: {
          from: 'buyers',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer',
        },
      },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          orderId: 1,
          productId: 1,
          size: 1,
          quantity: 1,
          price: 1,
          status: 1,
          createdAt: 1,
          'product.name': 1,
          'product.images': 1,
          'product.brand': 1,
          'buyer.name': 1,
          'buyer.email': 1,
        },
      },
    ];

    // Compute live metrics: Today's order count & Tab counts in single aggregation trip
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [orders, metrics] = await Promise.all([
      OrderItemModel.aggregate(pipeline),
      OrderItemModel.aggregate([
        { $match: { retailerId: retailerObjectId } },
        {
          $facet: {
            todayOrdersCount: [
              { $match: { createdAt: { $gte: todayStart } } },
              { $count: 'total' },
            ],
            stageCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const todayCount = metrics[0]?.todayOrdersCount[0]?.total || 0;
    const stageCounts = metrics[0]?.stageCounts || [];

    // Real average prep time (accepted -> ready); falls back to the store's configured prep time
    const [measuredPrep, storeSettings] = await Promise.all([
      AnalyticsFunnelSubService.getAveragePrepMinutes(profileId),
      RetailerStoreSettingsSubService.getSettingsInternal(profileId),
    ]);

    return {
      activeStage: stage,
      orders,
      metrics: {
        todayOrdersCount: todayCount,
        averagePrepTimeMinutes: measuredPrep ?? storeSettings.prepTimeMinutes,
        targetPrepTimeMinutes: storeSettings.prepTimeMinutes,
        stageCounts,
      },
    };
  }
}
