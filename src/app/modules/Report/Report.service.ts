import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { IReport } from "./Report.interface";
import ReportModel from "./Report.model";



const createNewReport = async (
    userDetails: IJwtPayload, 
    files: Express.Multer.File[],
    payload: Partial<IReport>
) => {

    const {profileId} = userDetails;

    let imageUrls;

    if(files.length > 0){

        imageUrls = files.map(file => {
            // Assuming you have a function to upload the file and get its URL
            return `uploads/report-image/${file.filename}`; // Replace with actual URL generation logic
        });
    }


    console.log("product images:",imageUrls);


    const report = await ReportModel.create({
        buyerId:profileId,
        images: imageUrls,
        ...payload
    });

    if(!report){
        throw new ApiError(500,"Failed to add new report.");
    }

    //send notification /email

    return report;
};

const getAllReport = async () => {

    
};


const ReportServices = { 
    createNewReport,
 };

export default ReportServices;