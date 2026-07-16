import multer from "multer";
import { createDiskStorage } from "../../helper/multer";
import { multerS3Storage } from "../../helper/multerS3";

const imageFileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .png or .jpeg format allowed!"));
  }
};

//multer configuration for local storage

// upload user image
 export const uploadProfile = multer({
   storage: createDiskStorage("profile-image"),
 
   limits: {
     fileSize: 5 * 1024 * 1024, // 5MB . less than 5mb file allowed
    //  fieldSize: 3 * 1024 *1024
   },

   fileFilter: imageFileFilter,
 });

 // upload post image
 export const uploadPostImage = multer({
   storage: createDiskStorage("post-image"),
 
   limits: {
     fileSize: 3145728, // 3MB . less than 3mb file allowed
    //  fieldSize: 3 * 1024 *1024
   },
 
   fileFilter: (req, file, cb) => {
    
       if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg" ) {
 
         cb(null, true);
 
       } else {
         cb(new Error("Only .jpg, .png or .jpeg format allowed!"));
       }
     
   },
 });

 // upload category image
 export const uploadCategoryImage = multer({
   storage: createDiskStorage("category-image"),
 
   limits: {
     fileSize: 3145728, // 3MB . less than 3mb file allowed
    //  fieldSize: 3 * 1024 *1024
   },
 
   fileFilter: (req, file, cb) => {
    
       if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg" ) {
 
         cb(null, true);
 
       } else {
         cb(new Error("Only .jpg, .png or .jpeg format allowed!"));
       }
     
   },
 });

 // upload promotional image
 export const uploadPromotionalImage = multer({
   storage: createDiskStorage("promotional-image"),
 
   limits: {
     fileSize: 3145728, // 3MB . less than 3mb file allowed
    //  fieldSize: 3 * 1024 *1024
   },
 
   fileFilter: (req, file, cb) => {
    
       if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg" ) {
 
         cb(null, true);
 
       } else {
         cb(new Error("Only .jpg, .png or .jpeg format allowed!"));
       }
     
   },
 });

// upload promotional video
export const uploadPromotionalVideo = multer({
  storage: createDiskStorage("promotional-video"),

  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
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
      cb(
        new Error(
          "Only video files are allowed (mp4, webm, ogg, mov)"
        )
      );
    }
  },
});

// Dedicated uploaders for other entities to preserve directory structure without relying on file.fieldname
export const uploadPairImage = multer({
  storage: createDiskStorage("pair-image"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadProductImage = multer({
  storage: createDiskStorage("product-image"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadChatFiles = multer({
  storage: createDiskStorage("chat-files"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadAdminImage = multer({
  storage: createDiskStorage("admin-image"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadReportImage = multer({
  storage: createDiskStorage("report-image"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadRetailerFile = multer({
  storage: createDiskStorage("retailer-file"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadCoverImage = multer({
  storage: createDiskStorage("cover-image"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadRetailerFields = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      let folder = "profile-image";
      if (file.fieldname === "cover-image") folder = "cover-image";
      else if (file.fieldname === "retailer-file") folder = "retailer-file";
      
      const fs = require('fs');
      const path = require('path');
      const uploadPath = path.join("uploads", folder);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const path = require('path');
      const fileExtension = path.extname(file.originalname);
      const fileName = file.originalname.replace(fileExtension, "").toLowerCase().split(" ").join("-") + "-" + Date.now();
      cb(null, fileName + fileExtension);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});


 // preapre the final multer upload object
//  export const uploadDocument = multer({
//    storage: profileStorage,
 
//    limits: {
//      fileSize: 3145728, // 3MB . less than 3mb file allowed
//     //  fieldSize: 3 * 1024 *1024
//    },
 
//    fileFilter: (req, file, cb) => {
    
//        if (file.mimetype === "application/pdf" ) {
 
//          cb(null, true);
 
//        } else {
//          cb(new Error("Only pdf file format allowed!"));
//        }
     
//    },
//  });


//aws s3 multer middleware configuration

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