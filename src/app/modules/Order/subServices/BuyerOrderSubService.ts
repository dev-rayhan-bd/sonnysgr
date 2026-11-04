import mongoose from 'mongoose';
import { OrderModel } from '../Order.model';
import QueryBuilder from '../../../builder/QueryBuilder';

/**
 * Sub-Service dedicated to Buyer Order History queries
 */
export class BuyerOrderSubService {
  /**
   * Get buyer's orders with QueryBuilder (search, filter, sort, paginate)
   */
  static async getMyOrders(buyerId: string, query: Record<string, unknown>) {
    const filter: Record<string, any> = {
      buyerId: new mongoose.Types.ObjectId(buyerId),
    };

    const queryBuilder = new QueryBuilder(OrderModel.find(filter), query)
      .search(['orderNumber'])
      .filter()
      .sort()
      .paginate()
      .fields();

    const [data, meta] = await Promise.all([
      queryBuilder.modelQuery.lean(),
      queryBuilder.countTotal(),
    ]);

    return { data, meta };
  }
}

