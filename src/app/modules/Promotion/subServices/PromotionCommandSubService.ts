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
    // multipart sends scheduledAt as a string; .getTime() on it used to throw (500)
    const startAt = payload.scheduledAt ? new Date(payload.scheduledAt) : new Date();
    if (Number.isNaN(startAt.getTime())) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'scheduledAt must be a valid date.');
    }
    const durationHours = Number(payload.duration) || 24;
    const expiresAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);

    const promotion = await PromotionModel.create({
      ...payload,
      scheduledAt: startAt,
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
   * Edit a promotion that has not gone out yet (Draft or Scheduled).
   * Only content fields are editable; status/isActive/startAt/expiresAt are derived, never taken
   * from the request (the old version spread the raw body into $set).
   */
  static async editPromotion(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    promotionId: string,
    payload: Partial<IPromotion>
  ) {
    const { profileId } = userDetails;
    const promotion = await PromotionModel.findOne({ _id: promotionId, retailerID: profileId }).lean<IPromotion>();
    if (!promotion) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Promotion not found or access denied.');
    }

    const editable = [ENUM_PROMOTION_STATUS.DRAFT, ENUM_PROMOTION_STATUS.SCHEDULED];
    if (!editable.includes(promotion.status as string)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `A promotion that is ${promotion.status} has already been sent and can no longer be edited.`
      );
    }

    const set: Record<string, unknown> = {};
    for (const key of ['title', 'content', 'type', 'recepient'] as const) {
      if (payload[key] !== undefined) set[key] = payload[key];
    }
    if (payload.duration !== undefined) set.duration = Number(payload.duration);

    // A scheduled promotion's window follows its (possibly new) start time and duration
    if (promotion.status === ENUM_PROMOTION_STATUS.SCHEDULED && (payload.scheduledAt || payload.duration !== undefined)) {
      const startAt = payload.scheduledAt ? new Date(payload.scheduledAt) : new Date(promotion.startAt as Date);
      if (startAt.getTime() <= Date.now()) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'scheduledAt must be in the future.');
      }
      const hours = Number(set.duration ?? promotion.duration) || 24;
      Object.assign(set, {
        scheduledAt: startAt,
        startAt,
        expiresAt: new Date(startAt.getTime() + hours * 60 * 60 * 1000),
      });
    } else if (payload.scheduledAt) {
      set.scheduledAt = new Date(payload.scheduledAt);
    }

    if (files && files.length > 0) {
      const uploadedMedia = await uploadMultipleToCloud(files, 'promotions');
      set.images = uploadedMedia.map((m) => m.url);
    }

    if (Object.keys(set).length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Nothing to update.');
    }

    // Status in the filter: a cron activation between read and write makes this a 409, not a silent edit
    const updatedPromotion = await PromotionModel.findOneAndUpdate(
      { _id: promotionId, retailerID: profileId, status: promotion.status },
      { $set: set },
      { new: true, runValidators: true }
    );
    if (!updatedPromotion) {
      throw new AppError(StatusCodes.CONFLICT, 'Promotion status changed while editing. Refresh and try again.');
    }

    return updatedPromotion;
  }
}
