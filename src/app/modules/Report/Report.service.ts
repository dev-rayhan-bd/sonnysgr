import ApiError from "../../../error/ApiError";
import { uploadFilesToCloudUrls } from "../../../helper/cloudStorage";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { IReport } from "./Report.interface";
import ReportModel from "./Report.model";
import { notifyAdmins } from "../Dashboard/notifications/adminNotification.service";



const createNewReport = async (
    userDetails: IJwtPayload, 
    files: Express.Multer.File[],
    payload: Partial<IReport>
) => {

    const {profileId} = userDetails;

    let imageUrls;

    if(files && files.length > 0){

        imageUrls = await uploadFilesToCloudUrls(files, "reports");
    }




    const report = await ReportModel.create({
        buyerId:profileId,
        images: imageUrls,
        ...payload
    });

    if(!report){
        throw new ApiError(500,"Failed to add new report.");
    }

    await notifyAdmins({
        title: `New report: ${report.title}`,
        description: String(report.content).slice(0, 200),
        type: "NEW_REPORT",
        referenceId: report._id,
        referenceModel: "Report",
    });

    //send notification /email

    return report;
};

const getAllReport = async () => {

    
};


const ReportServices = { 
    createNewReport,
 };

export default ReportServices;