import multer from "multer";

// Memory storage for direct cloud streaming (Cloudinary / AWS S3)
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimeTypes = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image formats (.jpg, .png, .jpeg, .webp) and PDF documents are allowed!"));
  }
};

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500 MB upload limit

// Reusable cloud-ready multer configuration
const createCloudMulter = () =>
  multer({
    storage: memoryStorage,
    limits: {
      fileSize: MAX_UPLOAD_SIZE,
      fieldSize: MAX_UPLOAD_SIZE,
    },
    fileFilter: imageFileFilter,
  });

// Profile avatar uploader
export const uploadProfile = createCloudMulter();

// Post / Feed image uploader
export const uploadPostImage = createCloudMulter();

// Category image uploader
export const uploadCategoryImage = createCloudMulter();

// Promotional image uploader
export const uploadPromotionalImage = createCloudMulter();

// Promotional video uploader (500MB)
export const uploadPromotionalVideo = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video or image files are allowed."));
    }
  },
});

// Pair / Reseller listing uploader
export const uploadPairImage = createCloudMulter();

// Product image uploader (multi-image catalog)
export const uploadProductImage = createCloudMulter();

// Chat attachment uploader
export const uploadChatFiles = createCloudMulter();

// Admin assets uploader
export const uploadAdminImage = createCloudMulter();

// Report & dispute uploader
export const uploadReportImage = createCloudMulter();

// Retailer documents & licenses uploader
export const uploadRetailerFile = createCloudMulter();

// Store cover image uploader
export const uploadCoverImage = createCloudMulter();

// Retailer multiple field uploader (profile-image, cover-image, licence, retailer-file)
export const uploadRetailerFields = createCloudMulter();
