import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import config from '../app/config';
import AppError from '../app/errors/AppError';
import { StatusCodes } from 'http-status-codes';

// Standardized return type for all uploads
export interface ICloudUploadResult {
  url: string;
  key: string;
  public_id?: string;
  size: number;
  mimetype: string;
}

// Check whether AWS S3 credentials are validly supplied in .env
export const isAwsS3Configured = (): boolean => {
  return !!(
    config.aws.access_key &&
    config.aws.secret_access_key &&
    config.aws.bucket_name
  );
};

// Initialize S3 Client lazily
let s3ClientInstance: S3Client | null = null;
const getS3Client = (): S3Client => {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.access_key!,
        secretAccessKey: config.aws.secret_access_key!,
      },
    });
  }
  return s3ClientInstance;
};

// Configure Cloudinary
if (config.cloudinary_cloud_name && config.cloudinary_api_key && config.cloudinary_api_secret) {
  cloudinary.config({
    cloud_name: config.cloudinary_cloud_name,
    api_key: config.cloudinary_api_key,
    api_secret: config.cloudinary_api_secret,
    secure: true,
  });
}

/**
 * Upload buffer to AWS S3
 */
const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = 'gosnkr'
): Promise<ICloudUploadResult> => {
  const client = getS3Client();
  const ext = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileKey = `${folder}/${Date.now()}_${baseName}${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.bucket_name,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await client.send(command);

  const region = config.aws.region;
  const bucket = config.aws.bucket_name;
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;

  return {
    url: publicUrl,
    key: fileKey,
    size: file.size,
    mimetype: file.mimetype,
  };
};

/**
 * Upload buffer to Cloudinary via upload_stream
 */
const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'gosnkr'
): Promise<ICloudUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(
            new AppError(
              StatusCodes.INTERNAL_SERVER_ERROR,
              error?.message || 'Failed to upload media to Cloudinary'
            )
          );
        }

        resolve({
          url: result.secure_url,
          key: result.public_id,
          public_id: result.public_id,
          size: result.bytes || file.size,
          mimetype: file.mimetype,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * Main Dynamic Cloud Upload:
 * If AWS S3 credentials exist in .env -> Uploads to AWS S3.
 * Otherwise -> Uploads to Cloudinary by default.
 */
export const uploadToCloud = async (
  file: Express.Multer.File,
  folder: string = 'gosnkr'
): Promise<ICloudUploadResult> => {
  if (!file || !file.buffer) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'No file buffer provided for upload');
  }

  if (isAwsS3Configured()) {
    return await uploadToS3(file, folder);
  }

  return await uploadToCloudinary(file, folder);
};

/**
 * Upload multiple files to Cloud Storage in parallel
 */
export const uploadMultipleToCloud = async (
  files: Express.Multer.File[],
  folder: string = 'gosnkr'
): Promise<ICloudUploadResult[]> => {
  if (!files || files.length === 0) return [];
  return await Promise.all(files.map((file) => uploadToCloud(file, folder)));
};

/**
 * Delete a media file from cloud storage
 */
export const deleteFromCloud = async (keyOrPublicId: string): Promise<void> => {
  if (!keyOrPublicId) return;

  if (isAwsS3Configured()) {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.aws.bucket_name,
        Key: keyOrPublicId,
      })
    );
  } else {
    await cloudinary.uploader.destroy(keyOrPublicId);
  }
};

