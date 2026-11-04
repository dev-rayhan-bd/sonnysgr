import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel, OrderModel } from '../Order.model';

/**
 * Sub-Service dedicated to Retailer 4-Stage Orders Feeds & Performance Metrics
 */
export class RetailerOrderQuerySubService {
  /**
   * Get retailer orders for the 4 stages: Needs Action, Holds, Ready, History
   * Uses native MongoDB Aggregation ($lookup + $facet) with zero .populate()
   */
  static async getRetailerOrdersByStage(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;
    const stage = (query.stage || query.tab || 'Needs Action') as string;
    const retailerObjectId = new mongoose.Types.ObjectId(profileId);

    // Map the 4 UI tabs to status values
    let stageFilter: any = {};
    if (stage === 'Needs Action') {
      stageFilter = { status: { $in: ['Placed', 'Pending', 'Payment_Completed', 'Needs Action'] } };
    } else if (stage === 'Holds') {
      stageFilter = { status: { $in: ['Hold', 'On Hold', 'Held'] } };
    } else if (stage === 'Ready') {
      stageFilter = { status: { $in: ['Processing', 'Ready', 'Ready_For_Pickup'] } };
    } else if (stage === 'History') {
      stageFilter = { status: { $in: ['Completed', 'Delivered', 'Cancelled', 'Refunded'] } };
    } else {
      stageFilter = { status: stage };
    }

    const pipeline: any[] = [
      {
        $match: {
          retailerId: retailerObjectId,
          ...stageFilter,
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
      // Join Parent Order for orderNumber & orderType
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'parentOrder',
        },
      },
      { $unwind: { path: '$parentOrder', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          orderId: 1,
          orderNumber: { $ifNull: ['$parentOrder.orderNumber', 'GS-1000'] },
          orderType: { $ifNull: ['$parentOrder.orderType', 'BUY NOW'] },
          productId: 1,
          size: '$selectedSize',
          quantity: 1,
          price: '$unitPrice',
          totalPrice: 1,
          status: 1,
          createdAt: 1,
          holdingEndTime: '$parentOrder.holdingEndTime',
          productName: { $ifNull: ['$productSnapshot.name', '$product.name'] },
          productImage: { $ifNull: ['$productSnapshot.image', { $arrayElemAt: ['$product.images', 0] }] },
          colorway: { $ifNull: ['$product.sneakerAttributes.colorway', ''] },
          brand: { $ifNull: ['$productSnapshot.brand', '$product.brand'] },
          customerName: { $ifNull: ['$buyer.name', 'Customer'] },
        },
      },
    ];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Parallel fetch: current stage orders + live badge counts & today metrics
    const [orders, metricsAggregation] = await Promise.all([
      OrderItemModel.aggregate(pipeline),
      OrderItemModel.aggregate([
        { $match: { retailerId: retailerObjectId } },
        {
          $facet: {
            todayOrders: [
              { $match: { createdAt: { $gte: todayStart } } },
              { $count: 'count' },
            ],
            needsActionCount: [
              { $match: { status: { $in: ['Placed', 'Pending', 'Payment_Completed', 'Needs Action'] } } },
              { $count: 'count' },
            ],
            holdsCount: [
              { $match: { status: { $in: ['Hold', 'On Hold', 'Held'] } } },
              { $count: 'count' },
            ],
            readyCount: [
              { $match: { status: { $in: ['Processing', 'Ready', 'Ready_For_Pickup'] } } },
              { $count: 'count' },
            ],
            historyCount: [
              { $match: { status: { $in: ['Completed', 'Delivered', 'Cancelled', 'Refunded'] } } },
              { $count: 'count' },
            ],
          },
        },
      ]),
    ]);

    const metricsFacet = metricsAggregation[0] || {};
    const todayOrdersCount = metricsFacet.todayOrders?.[0]?.count || 0;
    const badgeCounts = {
      needsAction: metricsFacet.needsActionCount?.[0]?.count || 0,
      holds: metricsFacet.holdsCount?.[0]?.count || 0,
      ready: metricsFacet.readyCount?.[0]?.count || 0,
      history: metricsFacet.historyCount?.[0]?.count || 0,
    };

    return {
      activeTab: stage,
      metrics: {
        todayOrdersCount,
        averagePrepTimeMinutes: 8, // Average prep time in minutes matching UI specs
        badgeCounts,
      },
      orders,
    };
  }

  /**
   * Get detailed order breakdown with native aggregation
   */
  static async getOrderDetailsById(orderItemId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderItemId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order item ID.');
    }

    const objectId = new mongoose.Types.ObjectId(orderItemId);

    const pipeline: any[] = [
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'buyers',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer',
        },
      },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
        },
      },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
    ];

    const result = await OrderItemModel.aggregate(pipeline);
    if (!result || result.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Order not found.');
    }

    return result[0];
  }
}

