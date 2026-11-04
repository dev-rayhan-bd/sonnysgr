import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import {
  ENUM_PROMOTION_SEND_METHOD,
  ENUM_PROMOTION_STATUS,
} from '../../../../utilities/enum';
import { IPromotion } from '../Promotion.interface';
import PromotionModel from '../Promotion.model';
import { uploadMultipleToCloud } from '../../../../helper/cloudStorage';

/**
 * Sub-Service dedicated to Promotion Creation, Editing, and Cron State Management
 */
export class PromotionCommandSubService {
  /**
   * Cron job: Activate scheduled promotions whose start time has arrived
   */
  static async handleActivePromotion() {
    const now = new Date();
    await PromotionModel.updateMany(
      {
        status: ENUM_PROMOTION_STATUS.SCHEDULED,
        startAt: { $lte: now },
      },
      {
        $set: {
          status: ENUM_PROMOTION_STATUS.ACTIVE,
          isActive: true,
        },
      }
    );
  }

  /**
   * Cron job: Expire active promotions whose expiration time has arrived
   */
  static async handleExpiredPromotion() {
    const now = new Date();
    await PromotionModel.updateMany(
      {
        status: ENUM_PROMOTION_STATUS.ACTIVE,
        expiresAt: { $lte: now },
      },
      {
        $set: {
          status: ENUM_PROMOTION_STATUS.EXPIRED,
          isActive: false,
        },
      }
    );
  }

  /**
   * Save draft promotion
   */
  private static async saveDraftPromotion(payload: IPromotion) {
    const promotion = await PromotionModel.create({
      ...payload,
      status: ENUM_PROMOTION_STATUS.DRAFT,
      isActive: false,
    });

    if (!promotion) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save promotion draft.');
    }
    return promotion;
  }

  /**
   * Schedule promotion for a future time
   */
  private static async schedulePromotion(payload: IPromotion) {
    const startAt = payload.scheduledAt || new Date();
    const durationHours = payload.duration || 24;
    const expiresAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);

    const promotion = await PromotionModel.create({
      ...payload,
      startAt,
      expiresAt,
      status: ENUM_PROMOTION_STATUS.SCHEDULED,
      isActive: false,
    });

    return promotion;
  }

  /**
   * Send promotion immediately
   */
  private static async sendNowPromotion(payload: IPromotion) {
    const now = new Date();
    const durationHours = payload.duration || 24;
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    const promotion = await PromotionModel.create({
      ...payload,
      startAt: now,
      expiresAt,
      status: ENUM_PROMOTION_STATUS.ACTIVE,
      isActive: true,
    });

    return promotion;
  }

  /**
   * Create new promotion with banner image upload (Cloudinary + AWS S3 auto-switch)
   */
  static async createNewPromotion(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    payload: Partial<IPromotion>
  ) {
    const { profileId } = userDetails;
    payload.retailerID = new mongoose.Types.ObjectId(profileId) as any;

    // Handle Cloudinary / S3 Multi-Image Upload (500MB limit safe)
    if (files && files.length > 0) {
      const uploadedMedia = await uploadMultipleToCloud(files, 'promotions');
      payload.images = uploadedMedia.map((m) => m.url);
    }

    switch (payload.sendMethod) {
      case ENUM_PROMOTION_SEND_METHOD.SEND_NOW:
        return await this.sendNowPromotion(payload as IPromotion);

      case ENUM_PROMOTION_SEND_METHOD.SCHEDULED:
        return await this.schedulePromotion(payload as IPromotion);

      case ENUM_PROMOTION_SEND_METHOD.SAVE_DRAFT:
        return await this.saveDraftPromotion(payload as IPromotion);

      default:
        return await this.sendNowPromotion(payload as IPromotion);
    }
  }

  /**
   * Edit existing promotion
   */
  static async editPromotion(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    promotionId: string,
    payload: Partial<IPromotion>
  ) {
    const { profileId } = userDetails;
    const updateData: any = { ...payload };

    if (files && files.length > 0) {
      const uploadedMedia = await uploadMultipleToCloud(files, 'promotions');
      updateData.images = uploadedMedia.map((m) => m.url);
    }

    const updatedPromotion = await PromotionModel.findOneAndUpdate(
      { _id: promotionId, retailerID: profileId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedPromotion) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Promotion not found or access denied.');
    }

    return updatedPromotion;
  }
}

