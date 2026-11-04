import mongoose from 'mongoose';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { ProductModel, RecentSearchModel } from '../Product.model';

/**
 * Sub-Service dedicated to Product Full-Text Searching, Trending & Search History
 */
export class ProductSearchSubService {
  /**
   * Search products by keyword (name, brand, style code, colorway, size)
   */
  static async searchProducts(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const search = ((query.searchtext || query.search || query.searchTerm) as string)?.trim();
    const type = query.type as string;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { styleCode: { $regex: search, $options: 'i' } },
        { 'sneakerAttributes.colorway': { $regex: search, $options: 'i' } },
        { 'variant.size': search },
      ];

      // Save to recent searches asynchronously for buyers
      if (userDetails?.role === 'Buyer' && userDetails?.profileId) {
        RecentSearchModel.create({
          buyerId: userDetails.profileId,
          keyword: search,
          searchedAt: new Date(),
        }).catch(() => {});
      }
    }

    if (type) {
      filter.type = type;
    }

    const limit = Number(query.limit) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .select('name brand price images availability variant styleCode sneakerAttributes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    return {
      products,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get trending popular searches and buyer's recent search terms
   */
  static async getTrendingNowAndRecentSearches(userDetails: IJwtPayload) {
    const { profileId, role } = userDetails;

    // Fetch buyer's recent 5 searches
    let recentSearches: string[] = [];
    if (role === 'Buyer' && profileId) {
      const recent = await RecentSearchModel.find({ buyerId: profileId })
        .sort({ searchedAt: -1 })
        .limit(5)
        .lean();
      recentSearches = recent.map((r) => r.keyword);
    }

    // Top trending sneakers based on inventory search count or latest popular releases
    const trendingProducts = await ProductModel.find({
      availability: { $in: ['Active', 'In Stock'] },
    })
      .select('name brand images price styleCode sneakerAttributes')
      .sort({ totalSearchCount: -1, createdAt: -1 })
      .limit(6)
      .lean();

    return {
      recentSearches,
      trendingProducts,
    };
  }

  /**
   * Delete specific recent search
   */
  static async deleteRecentSearch(userDetails: IJwtPayload, searchId: string) {
    const { profileId } = userDetails;
    await RecentSearchModel.findOneAndDelete({
      _id: searchId,
      buyerId: profileId,
    });
    return null;
  }
}

