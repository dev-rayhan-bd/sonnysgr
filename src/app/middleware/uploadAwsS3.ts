// middlewares/uploadToS3.ts
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { s3 } from "../../config/awsS3";

// router.post(
//   "/upload-multiple",
//   uploadToS3.array("files", 5),
//   createPost
// );

// router.post(
//   "/upload",
//   uploadToS3.single("file"),
//   createPost
// );

// const createPost = catchAsync(async (req, res) => {
//   const file = req.file as Express.MulterS3.File;

//   // S3 gives you a public URL
//   const fileUrl = file.location;

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "File uploaded successfully",
//     data: {
//       url: fileUrl,
//       key: file.key,
//     },
//   });
// });




const multerS3Storage = multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME!,
    acl: "public-read", // or private
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const fileName = `uploads/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  });

//upload image to s3
export const uploadImageToS3 = multer({
  storage: multerS3Storage,

  limits: {
    fileSize: 3 * 1024 * 1024, // 50MB
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PNG, JPEG, and JPG are allowed."));
    }
  },
});

//upload video s3
export const uploadVideoToS3 = multer({
  storage: multerS3Storage,

  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/flv",
      "video/mkv",
      "video/3gp"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP4 and WEBM are allowed."));
    }
  },
});
