import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import OfferModel from "../Offer.model";
import QueryBuilder from "../../../builder/QueryBuilder";

/**
 * Sub-Service dedicated to Offer Read Operations, Inbound Feeds & Negotiation Timelines
 */
export class OfferQuerySubService {
  /**
   * Get all offers submitted by the authenticated retailer store
   */
  static async getMySentOffers(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const { profileId } = userDetails;

    const baseFilter: Record<string, any> = {
      buyerStoreId: new mongoose.Types.ObjectId(profileId),
    };

    if (query.status) {
      baseFilter.status = query.status;
    }

    const queryBuilder = new QueryBuilder(OfferModel.find(baseFilter), query)
      .search(["itemSnapshot.name", "itemSnapshot.brand", "itemSnapshot.styleCode"])
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await queryBuilder.modelQuery.lean();
    const meta = await queryBuilder.countTotal();

    return { meta, data };
  }

  /**
   * Get inbound store purchase offers received by the authenticated buyer
   */
  static async getInboundOffers(userDetails: IJwtPayload, query: Record<string, unknown>) {
    const { profileId } = userDetails;

    const baseFilter: Record<string, any> = {
      sellerId: new mongoose.Types.ObjectId(profileId),
    };

    if (query.status) {
      baseFilter.status = query.status;
    }

    const queryBuilder = new QueryBuilder(OfferModel.find(baseFilter), query)
      .search(["itemSnapshot.name", "itemSnapshot.brand", "storeName"])
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await queryBuilder.modelQuery.lean();
    const meta = await queryBuilder.countTotal();

    return { meta, data };
  }

  /**
   * Get full offer details including transparent fee breakdown and timeline
   */
  static async getOfferDetailsById(offerId: string) {
    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid offer ID format.");
    }

    const objectId = new mongoose.Types.ObjectId(offerId);

    const pipeline: any[] = [
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: "retailers",
          localField: "buyerStoreId",
          foreignField: "_id",
          as: "store",
        },
      },
      { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "buyers",
          localField: "sellerId",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          offerType: 1,
          targetItemId: 1,
          itemSnapshot: 1,
          sellerRole: 1,
          askingPrice: 1,
          currentOfferAmount: 1,
          platformFeePercent: 1,
          platformFeeAmount: 1,
          netSellerPayout: 1,
          status: 1,
          expiresAt: 1,
          note: 1,
          dropoffVerificationCode: 1,
          timeline: 1,
          createdAt: 1,
          updatedAt: 1,
          storeInfo: {
            _id: "$store._id",
            name: "$store.name",
            image: "$store.image",
            phone: "$store.phone",
            address: "$store.address",
            averageRating: "$store.averageRating",
          },
          sellerInfo: {
            _id: "$seller._id",
            name: "$seller.name",
            image: "$seller.image",
            phone: "$seller.phone",
          },
        },
      },
    ];

    const results = await OfferModel.aggregate(pipeline);
    if (!results || results.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, "Offer not found.");
    }

    const offer = results[0];
    const now = new Date();
    const remainingMs = Math.max(0, new Date(offer.expiresAt).getTime() - now.getTime());
    const remainingHours = Math.round((remainingMs / (1000 * 60 * 60)) * 10) / 10;

    return {
      ...offer,
      remainingHours,
      isExpired: remainingMs === 0,
    };
  }
}

