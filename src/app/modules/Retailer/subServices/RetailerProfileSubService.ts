import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { IOperationHour, IRetailer } from '../Retailer.interface';
import RetailerModel from '../Retailer.model';
import AuthModel from '../../auth/auth.model';
import { uploadToCloud, deleteFromCloud } from '../../../../helper/cloudStorage';

/**
 * Sub-Service dedicated to Retailer Profile, Branding & Verification operations
 */
export class RetailerProfileSubService {
  /**
   * Update retailer profile details and upload images to Cloudinary / AWS S3
   */
  static async updateProfile(
    userDetails: IJwtPayload,
    profileImage: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    licence: Express.Multer.File | undefined,
    payload: Record<string, any>
  ): Promise<IRetailer> {
    const { profileId, authId } = userDetails;
    const { name, details, phone, website, address, latitude, longitude } = payload;

    const profile: any = await RetailerModel.findById(profileId).lean();
    if (!profile) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer not found to update.');
    }

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (details !== undefined) updateData.details = details;
    if (phone) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (address !== undefined) updateData.address = address;

    // Upload Profile Image to Cloud Storage (Cloudinary/S3)
    if (profileImage && profileImage.buffer) {
      const uploaded = await uploadToCloud(profileImage, 'retailer/profiles');
      updateData.image = uploaded.url;
      if (profile.image) {
        await deleteFromCloud(profile.image).catch(() => {});
      }
    }

    // Upload Cover Image to Cloud Storage
    if (coverImage && coverImage.buffer) {
      const uploadedCover = await uploadToCloud(coverImage, 'retailer/covers');
      updateData.coverImage = uploadedCover.url;
      if (profile.coverImage) {
        await deleteFromCloud(profile.coverImage).catch(() => {});
      }
    }

    // Upload Trade License
    if (licence && licence.buffer) {
      const uploadedLicence = await uploadToCloud(licence, 'retailer/licenses');
      updateData.license = uploadedLicence.url;
      if (profile.license) {
        await deleteFromCloud(profile.license).catch(() => {});
      }
    }

    // Geospatial Coordinates update
    if (latitude != null && longitude != null) {
      updateData['location.type'] = 'Point';
      updateData['location.coordinates'] = [Number(longitude), Number(latitude)];
    }

    const updatedProfile = await RetailerModel.findByIdAndUpdate(
      profileId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update profile.');
    }

    if (authId && name) {
      await AuthModel.findByIdAndUpdate(authId, { $set: { name } });
    }

    return updatedProfile;
  }

  /**
   * Upload retailer verification license and documents
   */
  static async addVerificationInfo(
    userDetails: IJwtPayload,
    licenseFile: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: Record<string, any>
  ): Promise<IRetailer> {
    const { profileId } = userDetails;
    const profile = await RetailerModel.findById(profileId);
    if (!profile) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer not found.');
    }

    const updateData: Record<string, any> = {};

    if (licenseFile && licenseFile.buffer) {
      const uploadedLic = await uploadToCloud(licenseFile, 'retailer/licenses');
      updateData.license = uploadedLic.url;
    }

    if (coverImage && coverImage.buffer) {
      const uploadedCover = await uploadToCloud(coverImage, 'retailer/covers');
      updateData.coverImage = uploadedCover.url;
    }

    if (payload.address) updateData.address = payload.address;
    if (payload.phone) updateData.phone = payload.phone;

    const updated = await RetailerModel.findByIdAndUpdate(
      profileId,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update verification info.');
    }

    return updated;
  }

  /**
   * Complete retailer profile for newly registered stores
   */
  static async completeProfile(
    userDetails: IJwtPayload,
    email: string,
    files: { [fieldname: string]: Express.Multer.File[] } | undefined,
    payload: Record<string, any>
  ): Promise<IRetailer> {
    const { profileId, authId } = userDetails;
    const profile = await RetailerModel.findById(profileId);
    if (!profile) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer profile not found.');
    }

    const { name, phone, address, website, latitude, longitude, details } = payload;
    const updateData: Record<string, any> = {
      name,
      phone,
      address,
      website,
      details,
    };

    if (latitude != null && longitude != null) {
      updateData.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      };
    }

    const profileImage = files?.['profile-image']?.[0];
    const coverImage = files?.['cover-image']?.[0];
    const licence = files?.['licence']?.[0];

    if (profileImage && profileImage.buffer) {
      const up = await uploadToCloud(profileImage, 'retailer/profiles');
      updateData.image = up.url;
    }
    if (coverImage && coverImage.buffer) {
      const up = await uploadToCloud(coverImage, 'retailer/covers');
      updateData.coverImage = up.url;
    }
    if (licence && licence.buffer) {
      const up = await uploadToCloud(licence, 'retailer/licenses');
      updateData.license = up.url;
    }

    const updated = await RetailerModel.findByIdAndUpdate(
      profileId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to complete profile.');
    }

    if (authId && name) {
      await AuthModel.findByIdAndUpdate(authId, { $set: { name, isProfileCompleted: true } });
    }

    return updated;
  }

  /**
   * Toggle store operation hours open/close for specific day
   */
  static async toggleOperationHour(
    userDetails: IJwtPayload,
    query: Record<string, unknown>
  ): Promise<IOperationHour[]> {
    const { profileId } = userDetails;
    const { day } = query;

    if (!day || typeof day !== 'string') {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Day parameter is required.');
    }

    const retailer = await RetailerModel.findById(profileId);
    if (!retailer) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Retailer not found.');
    }

    const targetDay = retailer.operationHour.find(
      (h: IOperationHour) => h.day.toLowerCase() === day.toLowerCase()
    );

    if (!targetDay) {
      throw new AppError(StatusCodes.NOT_FOUND, `Operation hours not found for ${day}`);
    }

    targetDay.isOpen = !targetDay.isOpen;
    await retailer.save();

    return retailer.operationHour;
  }
}
