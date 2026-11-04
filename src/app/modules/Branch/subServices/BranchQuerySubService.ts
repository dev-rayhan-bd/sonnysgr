import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { BranchModel } from '../Branch.model';
import QueryBuilder from '../../../builder/QueryBuilder';

/**
 * Sub-Service dedicated to Branch Read Operations, Feeds, and Native Aggregations (Zero .populate())
 */
export class BranchQuerySubService {
  /**
   * Get retailer branches with QueryBuilder pagination & searching
   */
  static async getRetailerBranches(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ) {
    const { profileId } = userDetails;

    const branchQuery = new QueryBuilder(
      BranchModel.find({ parentRetailerId: new mongoose.Types.ObjectId(profileId) }),
      query
    )
      .search(['name', 'phone', 'address'])
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await branchQuery.modelQuery.lean();
    const meta = await branchQuery.countTotal();

    return { meta, data };
  }

  /**
   * Get single branch detail for retailer
   */
  static async getSingleBranch(userDetails: IJwtPayload, branchId: string) {
    const { profileId } = userDetails;
    const branch = await BranchModel.findOne({
      _id: branchId,
      parentRetailerId: profileId,
    }).lean();

    if (!branch) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Branch not found.');
    }
    return branch;
  }

  /**
   * Branch Switcher Feed for Mobile App (Module 16.1)
   * Returns active branches with live product counts and operation status
   */
  static async getBranchSwitcherFeed(userDetails: IJwtPayload) {
    const { profileId } = userDetails;
    const retailerObjectId = new mongoose.Types.ObjectId(profileId);

    const pipeline: any[] = [
      {
        $match: {
          parentRetailerId: retailerObjectId,
        },
      },
      // Join products to get live branch inventory count
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'branchId',
          as: 'branchProducts',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          address: 1,
          location: 1,
          profileImage: 1,
          coverImage: 1,
          inventoryType: 1,
          status: 1,
          branchSettings: 1,
          operationHours: 1,
          totalProductsInStock: { $size: '$branchProducts' },
        },
      },
      { $sort: { createdAt: 1 } },
    ];

    const branches = await BranchModel.aggregate(pipeline);
    return branches;
  }

  /**
   * Admin: Get all platform branches with native $lookup aggregation (Zero .populate())
   */
  static async getAllBranchesForAdmin(query: Record<string, unknown>) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $lookup: {
          from: 'retailers',
          localField: 'parentRetailerId',
          foreignField: '_id',
          as: 'parentRetailer',
        },
      },
      { $unwind: { path: '$parentRetailer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          address: 1,
          location: 1,
          status: 1,
          inventoryType: 1,
          createdAt: 1,
          'parentRetailer.name': 1,
          'parentRetailer.email': 1,
          'parentRetailer.phone': 1,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'total' }],
        },
      },
    ];

    const result = await BranchModel.aggregate(pipeline);
    const facetData = result[0] || {};
    const data = facetData.data || [];
    const total = facetData.totalCount?.[0]?.total || 0;
    const totalPage = Math.ceil(total / limit);

    return {
      meta: { page, limit, total, totalPage },
      data,
    };
  }

  /**
   * Admin: Get single branch detail with native $lookup aggregation (Zero .populate())
   */
  static async getSingleBranchForAdmin(branchId: string) {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid branch ID format.');
    }

    const pipeline: any[] = [
      { $match: { _id: new mongoose.Types.ObjectId(branchId) } },
      {
        $lookup: {
          from: 'retailers',
          localField: 'parentRetailerId',
          foreignField: '_id',
          as: 'parentRetailer',
        },
      },
      { $unwind: { path: '$parentRetailer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          'parentRetailer.license': 0,
          'parentRetailer.tradeLicence': 0,
        },
      },
    ];

    const result = await BranchModel.aggregate(pipeline);
    if (!result || result.length === 0) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Branch not found.');
    }

    return result[0];
  }
}

