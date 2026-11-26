import mongoose from 'mongoose';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { FollowModel } from '../../Engagement/Engagement.model';
import RetailerModel from '../../Retailer/Retailer.model';
import { DEFAULT_STORE_SETTINGS } from '../../Retailer/Retailer.constant';
import BuyerModel from '../../Buyer/Buyer.model';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';

/**
 * Sub-Service dedicated to Promotion Audience Calculation & Reach Estimation
 * Backs the mobile UI screen: "Review your promotion"
 */
export class PromotionAudienceSubService {
  /**
   * Calculate live audience reach estimate for the retailer's promotion
   * @param userDetails Retailer's JWT payload
   * @param query radius (in miles), shoeSize, recipientType
   */
  static async getAudiencePreview(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;
    const retailerObjectId = new mongoose.Types.ObjectId(profileId);

    const retailer = (await RetailerModel.findById(retailerObjectId).lean()) as any;
    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer profile not found.');
    }

    // Explicit radius wins; otherwise the store's configured service radius
    const radiusMiles = Number(
      query.radiusMiles ||
        query.radius ||
        retailer.storeSettings?.serviceRadiusMiles ||
        DEFAULT_STORE_SETTINGS.serviceRadiusMiles
    );
    if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'radius must be a positive number of miles.');
    }
    // $centerSphere takes radians: distance / Earth radius (3963.2 miles)
    const radiusRadians = radiusMiles / 3963.2;
    const targetSize = query.shoeSize ? Number(query.shoeSize) : null;

    // 1. Live Store Followers Count
    const followersCount = await FollowModel.countDocuments({
      retailerId: retailerObjectId,
    });

    // 2. Nearby Opted-In Sneakerheads
    let nearbyCustomersCount = 0;
    const [storeLng, storeLat] = retailer.location?.coordinates || [0, 0];

    if (storeLng !== 0 || storeLat !== 0) {
      // $geoWithin (not $nearSphere): MongoDB rejects $near/$nearSphere inside countDocuments,
      // which made this endpoint return 500. $geoWithin counts the same circle without sorting.
      const matchConditions: Record<string, unknown> = {
        location: {
          $geoWithin: { $centerSphere: [[storeLng, storeLat], radiusRadians] },
        },
      };

      if (targetSize) {
        matchConditions.$or = [
          { shoeSize: targetSize },
          { 'selectedShoeSize.size': targetSize },
        ];
      }

      nearbyCustomersCount = await BuyerModel.countDocuments(matchConditions);
    }

    // 3. Estimated Unique Reach (Followers + Nearby deduplicated projection)
    const estimatedReach = followersCount + Math.round(nearbyCustomersCount * 0.85);

    return {
      storeName: retailer.name,
      radiusMiles,
      targetShoeSize: targetSize,
      audienceBreakdown: {
        followersCount,
        nearbyCustomersCount,
        estimatedTotalReach: estimatedReach,
      },
    };
  }
}
