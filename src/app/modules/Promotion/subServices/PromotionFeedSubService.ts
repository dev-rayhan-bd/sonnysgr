import mongoose from 'mongoose';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import PromotionModel from '../Promotion.model';
import RetailerModel from '../../Retailer/Retailer.model';
import BuyerModel from '../../Buyer/Buyer.model';
import QueryBuilder from '../../../builder/QueryBuilder';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';

/**
 * Sub-Service dedicated to Promotion Feeds (Retailer Admin View & Buyer Targeted Drops)
 */
export class PromotionFeedSubService {
  /**
   * Get all promotions created by this retailer with QueryBuilder
   */
  static async getAllRetailerPromotion(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;

    const baseFilter: Record<string, any> = {
      retailerID: new mongoose.Types.ObjectId(profileId),
    };

    if (query.isActive !== undefined) {
      baseFilter.isActive = query.isActive === 'true' || query.isActive === true;
    }

    if (query.status) {
      baseFilter.status = query.status;
    }

    const queryBuilder = new QueryBuilder(PromotionModel.find(baseFilter), query)
      .search(['title', 'content'])
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await queryBuilder.modelQuery;
    const meta = await queryBuilder.countTotal();

    return { meta, data };
  }

  /**
   * Get hyper-local promotions for Buyer feed using native MongoDB Aggregation
   * Prioritizes followed stores and stores within 20km radius
   */
  static async getAllBuyerPromotion(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;
    const profileObjectId = new mongoose.Types.ObjectId(profileId);

    let lat = query.latitude ? Number(query.latitude) : null;
    let lng = query.longitude ? Number(query.longitude) : null;

    if (!lat || !lng) {
      const buyer = (await BuyerModel.findById(profileObjectId).lean()) as any;
      if (buyer?.location?.coordinates && buyer.location.coordinates[0] !== 0) {
        lng = buyer.location.coordinates[0];
        lat = buyer.location.coordinates[1];
      }
    }

    if (!lat || !lng) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'Latitude and longitude are required to fetch local promotional flash sales.'
      );
    }

    // Find nearby retailers within 20km
    const nearbyRetailers = await RetailerModel.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          distanceField: 'distance',
          maxDistance: 20 * 1000,
          spherical: true,
        },
      },
      { $project: { _id: 1 } },
    ]);

    const nearbyRetailerIds = nearbyRetailers.map((r) => r._id);

    // Native aggregation for targeted drops
    const buyerFeed = await PromotionModel.aggregate([
      {
        $match: {
          status: 'Active',
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'follows',
          let: { retailerId: '$retailerID' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$buyerId', profileObjectId] },
                    { $eq: ['$retailerId', '$$retailerId'] },
                  ],
                },
              },
            },
          ],
          as: 'follow',
        },
      },
      {
        $addFields: {
          isFollower: { $gt: [{ $size: '$follow' }, 0] },
          isNearby: { $in: ['$retailerID', nearbyRetailerIds] },
        },
      },
      {
        $match: {
          $or: [
            {
              $and: [{ recepient: 'All My Follower' }, { isFollower: true }],
            },
            {
              $and: [{ recepient: 'Nearby Customer' }, { isNearby: true }],
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'retailers',
          localField: 'retailerID',
          foreignField: '_id',
          as: 'retailer',
        },
      },
      { $unwind: { path: '$retailer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          follow: 0,
          'retailer.tradeLicence': 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return buyerFeed;
  }
}
