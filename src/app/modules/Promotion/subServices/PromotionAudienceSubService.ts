import mongoose from 'mongoose';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { FollowModel } from '../../Engagement/Engagement.model';
import RetailerModel from '../../Retailer/Retailer.model';
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

    const radiusMiles = Number(query.radiusMiles || query.radius || 10);
    const radiusMeters = radiusMiles * 1609.34;
    const targetSize = query.shoeSize ? Number(query.shoeSize) : null;

    // 1. Live Store Followers Count
    const followersCount = await FollowModel.countDocuments({
      retailerId: retailerObjectId,
    });

    // 2. Nearby Opted-In Sneakerheads
    let nearbyCustomersCount = 0;
    const [storeLng, storeLat] = retailer.location?.coordinates || [0, 0];

    if (storeLng !== 0 || storeLat !== 0) {
      const matchConditions: any = {
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [storeLng, storeLat],
            },
            $maxDistance: radiusMeters,
          },
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
