/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Request } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

export const createDiskStorage = (folderName: string) => {
  const uploadPath = path.join("uploads", folderName);

  return multer.diskStorage({
    destination: function (req: Request, file, cb) {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      //extract the file extension from filename
      const fileExtension = path.extname(file.originalname);

      const fileName = file.originalname.replace(fileExtension, "").toLowerCase().split(" ").join("-") +"-" + Date.now();

      cb(null, fileName + fileExtension);
    },
  });
};

// Keep profileStorage for backward compatibility, mapped to profile-image folder
export const profileStorage = createDiskStorage("profile-image");
 
 



