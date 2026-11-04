import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import RetailerModel from '../Retailer.model';
import QueryBuilder from '../../../builder/QueryBuilder';

/**
 * Sub-Service dedicated to Admin-level Retailer Management & Store Approvals
 */
export class RetailerStoreAdminSubService {
  /**
   * Admin: Get all stores with searching, filtering, and pagination using QueryBuilder
   */
  static async getAllStores(query: Record<string, unknown>) {
    const queryBuilder = new QueryBuilder(RetailerModel.find(), query)
      .search(['name', 'email', 'phone', 'address'])
      .filter()
      .sort()
      .paginate()
      .fields();

    const [stores, meta] = await Promise.all([
      queryBuilder.modelQuery.lean(),
      queryBuilder.countTotal(),
    ]);

    return { stores, meta };
  }

  /**
   * Admin: Approve or toggle retailer store approval
   */
  static async approveStore(id: string) {
    const store = await RetailerModel.findById(id);
    if (!store) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer store not found.');
    }

    store.isApproved = !store.isApproved;
    await store.save();

    return store;
  }
}
