import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import RetailerModel from '../Retailer.model';
import { IStoreSettings } from '../Retailer.interface';
import { DEFAULT_STORE_SETTINGS } from '../Retailer.constant';

/**
 * Sub-Service dedicated to store operation settings:
 * prep time, hold duration (Module 9.2), pickup window and service radius.
 */
export class RetailerStoreSettingsSubService {
  /**
   * Resolve a store's effective settings (stored values merged over defaults).
   * Used internally by Order, Demand and Promotion flows.
   */
  static async getSettingsInternal(
    retailerId: string | mongoose.Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IStoreSettings> {
    const query = RetailerModel.findById(retailerId).select('storeSettings').lean();
    if (session) query.session(session);
    const retailer = (await query) as { storeSettings?: Partial<IStoreSettings> } | null;

    return { ...DEFAULT_STORE_SETTINGS, ...(retailer?.storeSettings || {}) };
  }

  /**
   * GET the authenticated retailer's store settings
   */
  static async getStoreSettings(userDetails: IJwtPayload) {
    const exists = await RetailerModel.exists({ _id: userDetails.profileId });
    if (!exists) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer profile not found.');
    }
    return await RetailerStoreSettingsSubService.getSettingsInternal(userDetails.profileId);
  }

  /**
   * PATCH the authenticated retailer's store settings (partial update, atomic $set)
   */
  static async updateStoreSettings(userDetails: IJwtPayload, payload: Partial<IStoreSettings>) {
    const setStage: Record<string, number> = {};
    (Object.keys(DEFAULT_STORE_SETTINGS) as (keyof IStoreSettings)[]).forEach((key) => {
      if (payload[key] !== undefined) {
        setStage[`storeSettings.${key}`] = Number(payload[key]);
      }
    });

    if (Object.keys(setStage).length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Provide at least one setting to update.');
    }

    const updated = await RetailerModel.findByIdAndUpdate(
      userDetails.profileId,
      { $set: setStage },
      { new: true, runValidators: true }
    )
      .select('storeSettings')
      .lean();

    if (!updated) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer profile not found.');
    }

    return await RetailerStoreSettingsSubService.getSettingsInternal(userDetails.profileId);
  }
}
