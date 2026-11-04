import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { BranchModel } from '../Branch.model';
import { uploadToCloud, deleteFromCloud } from '../../../../helper/cloudStorage';

/**
 * Sub-Service dedicated to Branch Mutations: Create, Update, Delete
 */
export class BranchCommandSubService {
  /**
   * Create a new store branch with Cloudinary / S3 media uploads
   */
  static async createBranch(
    userDetails: IJwtPayload,
    profileImage: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: any
  ) {
    const { profileId } = userDetails;

    const {
      name,
      phone,
      address,
      latitude,
      longitude,
      inventoryType,
      pickupRules,
      isAcceptInAppOrder,
      isAcceptInHoldWithDeposit,
      isInStorePickupAvailable,
      operationHours,
      status,
    } = payload;

    const branchPayload: any = {
      parentRetailerId: profileId,
      name,
      phone,
      address,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
      inventoryType: inventoryType || 'SHARED',
      pickupRules: pickupRules || '',
      branchSettings: {
        acceptInAppOrders:
          isAcceptInAppOrder === 'true' || isAcceptInAppOrder === true,
        acceptHoldWithDeposit:
          isAcceptInHoldWithDeposit === 'true' ||
          isAcceptInHoldWithDeposit === true,
        inStorePickupAvailable:
          isInStorePickupAvailable === 'true' ||
          isInStorePickupAvailable === true,
      },
      operationHours: operationHours || [],
      status: status || 'active',
    };

    // Upload to Cloudinary / AWS S3 auto-switch
    if (profileImage) {
      const media = await uploadToCloud(profileImage, 'branch-profiles');
      branchPayload.profileImage = media.url;
    }

    if (coverImage) {
      const media = await uploadToCloud(coverImage, 'branch-covers');
      branchPayload.coverImage = media.url;
    }

    const result = await BranchModel.create(branchPayload);
    if (!result) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create branch.');
    }
    return result;
  }

  /**
   * Update store branch details with Cloudinary / S3 media replacements
   */
  static async updateBranch(
    userDetails: IJwtPayload,
    branchId: string,
    profileImage: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: any
  ) {
    const { profileId } = userDetails;

    const branch = await BranchModel.findOne({
      _id: branchId,
      parentRetailerId: profileId,
    });
    if (!branch) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Branch not found or unauthorized to edit.');
    }

    const {
      name,
      phone,
      address,
      latitude,
      longitude,
      inventoryType,
      pickupRules,
      isAcceptInAppOrder,
      isAcceptInHoldWithDeposit,
      isInStorePickupAvailable,
      operationHours,
      status,
    } = payload;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (inventoryType !== undefined) updateData.inventoryType = inventoryType;
    if (pickupRules !== undefined) updateData.pickupRules = pickupRules;
    if (operationHours !== undefined) updateData.operationHours = operationHours;
    if (status !== undefined) updateData.status = status;

    if (latitude !== undefined && longitude !== undefined) {
      updateData.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      };
    }

    if (
      isAcceptInAppOrder !== undefined ||
      isAcceptInHoldWithDeposit !== undefined ||
      isInStorePickupAvailable !== undefined
    ) {
      updateData.branchSettings = {
        acceptInAppOrders:
          isAcceptInAppOrder !== undefined
            ? isAcceptInAppOrder === 'true' || isAcceptInAppOrder === true
            : branch.branchSettings?.acceptInAppOrders,
        acceptHoldWithDeposit:
          isAcceptInHoldWithDeposit !== undefined
            ? isAcceptInHoldWithDeposit === 'true' ||
              isAcceptInHoldWithDeposit === true
            : branch.branchSettings?.acceptHoldWithDeposit,
        inStorePickupAvailable:
          isInStorePickupAvailable !== undefined
            ? isInStorePickupAvailable === 'true' ||
              isInStorePickupAvailable === true
            : branch.branchSettings?.inStorePickupAvailable,
      };
    }

    if (profileImage) {
      if (branch.profileImage) {
        await deleteFromCloud(branch.profileImage);
      }
      const media = await uploadToCloud(profileImage, 'branch-profiles');
      updateData.profileImage = media.url;
    }

    if (coverImage) {
      if (branch.coverImage) {
        await deleteFromCloud(branch.coverImage);
      }
      const media = await uploadToCloud(coverImage, 'branch-covers');
      updateData.coverImage = media.url;
    }

    const result = await BranchModel.findByIdAndUpdate(
      branchId,
      { $set: updateData },
      { new: true }
    );

    return result;
  }

  /**
   * Delete store branch
   */
  static async deleteBranch(userDetails: IJwtPayload, branchId: string) {
    const { profileId } = userDetails;

    const branch = await BranchModel.findOne({
      _id: branchId,
      parentRetailerId: profileId,
    });
    if (!branch) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Branch not found or unauthorized to delete.');
    }

    if (branch.profileImage) await deleteFromCloud(branch.profileImage);
    if (branch.coverImage) await deleteFromCloud(branch.coverImage);

    await BranchModel.findByIdAndDelete(branchId);
    return { message: 'Branch deleted successfully.' };
  }
}

