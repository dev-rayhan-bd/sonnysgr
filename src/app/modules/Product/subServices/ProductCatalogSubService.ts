import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { ProductModel } from '../Product.model';
import QueryBuilder from '../../../builder/QueryBuilder';

/**
 * Sub-Service dedicated to Product Catalog Feeds & Relational Details
 */
export class ProductCatalogSubService {
  /**
   * Get all products with standardized QueryBuilder (search, filter, sort, paginate)
   */
  static async getAllProducts(query: Record<string, unknown>) {
    const queryBuilder = new QueryBuilder(ProductModel.find(), query)
      .search(['name', 'brand', 'styleCode', 'sneakerAttributes.colorway'])
      .filter()
      .sort()
      .paginate()
      .fields();

    const [products, meta] = await Promise.all([
      queryBuilder.modelQuery.lean(),
      queryBuilder.countTotal(),
    ]);

    return { products, meta };
  }

  /**
   * Get product details with Retailer Store Info via native MongoDB Aggregation ($lookup)
   * Strictly zero .populate()
   */
  static async getProductDetailById(productId: string) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid product ID.');
    }

    const objectId = new mongoose.Types.ObjectId(productId);

    const pipeline: any[] = [
      { $match: { _id: objectId } },
      // Join Retailer Store Information
      {
        $lookup: {
          from: 'retailers',
          localField: 'retailerId',
          foreignField: '_id',
          as: 'retailer',
        },
      },
      { $unwind: { path: '$retailer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          type: 1,
          brand: 1,
          price: 1,
          images: 1,
          description: 1,
          styleCode: 1,
          availability: 1,
          variant: 1,
          sneakerAttributes: 1,
          createdAt: 1,
          'retailer._id': 1,
          'retailer.name': 1,
          'retailer.image': 1,
          'retailer.address': 1,
          'retailer.phone': 1,
          'retailer.averageRating': 1,
          'retailer.badge': 1,
          'retailer.location': 1,
        },
      },
    ];

    const result = await ProductModel.aggregate(pipeline);
    if (!result || result.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Product not found.');
    }

    return result[0];
  }
}

