import mongoose, { PipelineStage } from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel, OrderModel } from '../Order.model';
import { RETAILER_ORDER_STAGE_STATUSES, getRetailerStageStatusFilter } from '../Order.constant';

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
    const stageFilter = getRetailerStageStatusFilter(stage);

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
              { $match: { status: { $in: RETAILER_ORDER_STAGE_STATUSES.NEEDS_ACTION } } },
              { $count: 'count' },
            ],
            holdsCount: [
              { $match: { status: { $in: RETAILER_ORDER_STAGE_STATUSES.HOLDS } } },
              { $count: 'count' },
            ],
            readyCount: [
              { $match: { status: { $in: RETAILER_ORDER_STAGE_STATUSES.READY } } },
              { $count: 'count' },
            ],
            historyCount: [
              { $match: { status: { $in: RETAILER_ORDER_STAGE_STATUSES.HISTORY } } },
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
   * Order item detail for the retailer who owns it, the buyer who placed it, or an admin.
   * Only whitelisted fields are returned: the buyer is reduced to name/phone/image, and the
   * pickup code is hidden from the store (it is what the store must verify, so it must come
   * from the buyer).
   */
  static async getOrderDetailsById(userDetails: IJwtPayload, orderItemId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderItemId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order item ID.');
    }

    const { role, profileId } = userDetails;
    const isAdmin = ['Admin', 'Super_Admin'].includes(role);
    const isBuyer = role === 'Buyer';
    if (!isAdmin && !isBuyer && role !== 'Retailer') {
      throw new AppError(StatusCodes.FORBIDDEN, 'You do not have access to this order.');
    }

    // Ownership is part of the match: someone else's order is indistinguishable from a missing one
    const match: Record<string, unknown> = { _id: new mongoose.Types.ObjectId(orderItemId) };
    if (!isAdmin) {
      match[isBuyer ? 'buyerId' : 'retailerId'] = new mongoose.Types.ObjectId(profileId);
    }

    const orderProjection: Record<string, 1> = {
      orderNumber: 1,
      orderType: 1,
      orderStatus: 1,
      paymentStatus: 1,
      subtotal: 1,
      shippingCharge: 1,
      discountAmount: 1,
      totalAmount: 1,
      totalItems: 1,
      partialPayment: 1,
      holdingTime: 1,
      holdingStartTime: 1,
      holdingEndTime: 1,
      pickupTime: 1,
      'shippingAddress.name': 1,
      'shippingAddress.phone': 1,
      'shippingAddress.address': 1,
      'shippingAddress.city': 1,
      createdAt: 1,
    };
    if (isBuyer || isAdmin) orderProjection.pickupVerificationCode = 1;

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [{ $project: { name: 1, brand: 1, styleCode: 1, images: 1, price: 1 } }],
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'buyers',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer',
          pipeline: [{ $project: { name: 1, phone: 1, image: 1 } }],
        },
      },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
          pipeline: [{ $project: orderProjection }],
        },
      },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
      { $project: { __v: 0 } },
    ];

    const result = await OrderItemModel.aggregate(pipeline);
    if (!result || result.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Order not found.');
    }

    return result[0];
  }
}
