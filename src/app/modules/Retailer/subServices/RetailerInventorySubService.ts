import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { ProductModel } from '../../Product/Product.model';
import RetailerModel from '../Retailer.model';
import QueryBuilder from '../../../builder/QueryBuilder';

/**
 * Sub-Service dedicated to Retailer Inventory and Catalog queries
 */
export class RetailerInventorySubService {
  /**
   * Get paginated inventory items using centralized QueryBuilder + Status Aggregation
   */
  static async getRetailerInventory(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;

    const baseFilter: Record<string, unknown> = {
      retailerId: new mongoose.Types.ObjectId(profileId),
    };

    if (query.availability) {
      baseFilter.availability = query.availability;
    }

    if (query.type) {
      baseFilter.type = query.type;
    }

    // Mandatory QueryBuilder pipeline
    const queryBuilder = new QueryBuilder(ProductModel.find(baseFilter), query)
      .search(['name', 'brand', 'category', 'styleCode'])
      .filter()
      .sort()
      .paginate()
      .fields();

    const [products, meta, statusCounts] = await Promise.all([
      queryBuilder.modelQuery.select('-sneakerAttributes -tshirtAttributes').lean(),
      queryBuilder.countTotal(),
      ProductModel.aggregate([
        { $match: { retailerId: new mongoose.Types.ObjectId(profileId) } },
        {
          $group: {
            _id: '$availability',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCountsMap: Record<string, number> = {};
    statusCounts.forEach((item) => {
      if (item._id) statusCountsMap[item._id] = item.count;
    });

    return {
      products,
      meta,
      statusCounts: statusCountsMap,
    };
  }

  /**
   * Get complete retailer store details with active products via native MongoDB Aggregation ($lookup)
   * Strictly zero .populate()
   */
  static async getRetailerDetailWithProducts(retailerId: string) {
    if (!mongoose.Types.ObjectId.isValid(retailerId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid retailer ID.');
    }

    const objectId = new mongoose.Types.ObjectId(retailerId);

    const pipeline: any[] = [
      { $match: { _id: objectId } },
      // Lookup active products
      {
        $lookup: {
          from: 'products',
          let: { retId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$retailerId', '$$retId'] },
                availability: { $in: ['Active', 'In Stock', 'Low Stock'] },
              },
            },
            { $limit: 20 },
            { $project: { name: 1, brand: 1, price: 1, images: 1, variant: 1, availability: 1 } },
          ],
          as: 'featuredProducts',
        },
      },
      // Lookup branches under this store
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: 'retailerId',
          as: 'branches',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          image: 1,
          coverImage: 1,
          address: 1,
          phone: 1,
          website: 1,
          badge: 1,
          averageRating: 1,
          followersCount: 1,
          operationHour: 1,
          location: 1,
          featuredProducts: 1,
          branches: 1,
        },
      },
    ];

    const result = await RetailerModel.aggregate(pipeline);
    if (!result || result.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer store not found.');
    }

    return result[0];
  }
}
