import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
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

/** Every upload lands under this root folder so the media library stays tidy. */
const ROOT_FOLDER = 'gosnkr';
const withRoot = (folder: string) =>
  folder === ROOT_FOLDER || folder.startsWith(`${ROOT_FOLDER}/`) ? folder : `${ROOT_FOLDER}/${folder}`;

/** Above this size Cloudinary needs a chunked upload (its single-request limit is 100 MB). */
const CHUNKED_UPLOAD_THRESHOLD = 20 * 1024 * 1024;
const CHUNK_SIZE = 20 * 1024 * 1024;

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

// Configure Cloudinary. The SDK also reads CLOUDINARY_URL from the environment by itself.
if (config.cloudinary_cloud_name && config.cloudinary_api_key && config.cloudinary_api_secret) {
  cloudinary.config({
    cloud_name: config.cloudinary_cloud_name,
    api_key: config.cloudinary_api_key,
    api_secret: config.cloudinary_api_secret,
    secure: true,
  });
} else {
  cloudinary.config({ secure: true });
}

export const isCloudinaryConfigured = (): boolean => {
  const c = cloudinary.config();
  return !!(c.cloud_name && c.api_key && c.api_secret);
};

if (!isAwsS3Configured() && !isCloudinaryConfigured()) {
  console.warn(
    '[cloudStorage] No media storage configured: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (or AWS S3 keys). Uploads will fail.'
  );
}

/**
 * Upload buffer to AWS S3
 */
const uploadToS3 = async (file: Express.Multer.File, folder: string): Promise<ICloudUploadResult> => {
  const client = getS3Client();
  const ext = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileKey = `${folder}/${Date.now()}_${baseName}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.aws.bucket_name,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return {
    url: `https://${config.aws.bucket_name}.s3.${config.aws.region}.amazonaws.com/${fileKey}`,
    key: fileKey,
    size: file.size,
    mimetype: file.mimetype,
  };
};

/**
 * Upload buffer to Cloudinary. Large files (videos) go through the chunked uploader.
 */
const uploadToCloudinary = (file: Express.Multer.File, folder: string): Promise<ICloudUploadResult> => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Media storage is not configured (missing Cloudinary cloud name, API key or secret).'
    );
  }

  return new Promise((resolve, reject) => {
    const callback = (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
      if (error || !result) {
        return reject(
          new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to upload media to Cloudinary: ${error?.message || 'no response'}`
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
    };

    const options = { folder, resource_type: 'auto' as const };
    const stream =
      file.size > CHUNKED_UPLOAD_THRESHOLD
        ? cloudinary.uploader.upload_chunked_stream({ ...options, chunk_size: CHUNK_SIZE }, callback)
        : cloudinary.uploader.upload_stream(options, callback);

    stream.end(file.buffer);
  });
};

/**
 * Main Dynamic Cloud Upload:
 * If AWS S3 credentials exist in .env -> Uploads to AWS S3.
 * Otherwise -> Uploads to Cloudinary by default.
 */
export const uploadToCloud = async (
  file: Express.Multer.File,
  folder: string = ROOT_FOLDER
): Promise<ICloudUploadResult> => {
  if (!file || !file.buffer) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'No file buffer provided for upload');
  }

  const target = withRoot(folder);
  return isAwsS3Configured() ? uploadToS3(file, target) : uploadToCloudinary(file, target);
};

/**
 * Upload multiple files to Cloud Storage in parallel
 */
export const uploadMultipleToCloud = async (
  files: Express.Multer.File[],
  folder: string = ROOT_FOLDER
): Promise<ICloudUploadResult[]> => {
  if (!files || files.length === 0) return [];
  return await Promise.all(files.map((file) => uploadToCloud(file, folder)));
};

/** Convenience for services that only store URLs. */
export const uploadFilesToCloudUrls = async (
  files: Express.Multer.File[] | undefined,
  folder: string
): Promise<string[]> => (await uploadMultipleToCloud(files || [], folder)).map((f) => f.url);

/**
 * Turn a Cloudinary delivery URL into { publicId, resourceType }.
 * https://res.cloudinary.com/<cloud>/<image|video|raw>/upload/[transforms/][v123/]<public_id>.<ext>
 */
const parseCloudinaryUrl = (url: string) => {
  const match = url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:.*?\/)?(?:v\d+\/)(.+)$/)
    || url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(.+)$/);
  if (!match) return null;
  const resourceType = match[1] as 'image' | 'video' | 'raw';
  const rest = decodeURIComponent(match[2].split('?')[0]);
  // raw files keep their extension as part of the public_id
  const publicId = resourceType === 'raw' ? rest : rest.replace(/\.[^/.]+$/, '');
  return { publicId, resourceType };
};

/**
 * Delete a media file from cloud storage.
 * Accepts the stored URL, a Cloudinary public_id or an S3 key. Local "uploads/..." paths are ignored.
 */
export const deleteFromCloud = async (keyOrUrl: string): Promise<void> => {
  if (!keyOrUrl || keyOrUrl.startsWith('uploads/')) return;

  if (keyOrUrl.includes('res.cloudinary.com')) {
    const parsed = parseCloudinaryUrl(keyOrUrl);
    if (parsed && isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType, invalidate: true });
    }
    return;
  }

  if (isAwsS3Configured()) {
    const key = keyOrUrl.includes('.amazonaws.com/') ? keyOrUrl.split('.amazonaws.com/')[1] : keyOrUrl;
    await getS3Client().send(new DeleteObjectCommand({ Bucket: config.aws.bucket_name, Key: key }));
    return;
  }

  if (!/^https?:\/\//.test(keyOrUrl) && isCloudinaryConfigured()) {
    await cloudinary.uploader.destroy(keyOrUrl, { invalidate: true });
  }
};
