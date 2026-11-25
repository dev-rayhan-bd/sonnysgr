import fs from "fs";
import { deleteFromCloud } from "../helper/cloudStorage";

/**
 * Removes a previously stored file. Cloud URLs (Cloudinary / S3) are deleted from the bucket,
 * legacy local paths ("uploads/...") from disk. Never throws: a failed cleanup must not fail the request.
 */
const deleteOldFile = async (imgName?: string | null) => {
    if (!imgName) return;

    if (/^https?:\/\//.test(imgName)) {
        await deleteFromCloud(imgName).catch((err) =>
            console.error("[deleteOldFile] cloud delete failed:", err?.message || err)
        );
        return;
    }

    if (fs.existsSync(imgName)) {
        fs.unlinkSync(imgName); // delete the file
    }
};

export default deleteOldFile;
