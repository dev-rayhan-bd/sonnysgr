import ApiError from "../../../error/ApiError";
import { IAnalytics } from "./Analytics.interface";
import AnalyticsModel from "./Analytics.model";

//profile view count service function
const increaseProfileViewCount = async (retailerId: string) => {

    const analytics = await AnalyticsModel.findByIdAndUpdate(
        retailerId,
        {
            profileViewCount: {$inc: 1}
        }
    );

    //if not exist then create
    if(!analytics){
        const newAnalytics = await AnalyticsModel.create({
            retailerId: retailerId
        });

        if(!newAnalytics){
            throw new ApiError(500,"Failed to create new analytics collection.");
        }
    }

    return null;

};

//product view count service function
const increaseProductViewCount = async (retailerId: string) => {

    const analytics = await AnalyticsModel.findByIdAndUpdate(
        retailerId,
        {
            productViewCount: {$inc: 1}
        }
    );

    //if not exist then create
    if(!analytics){
        const newAnalytics = await AnalyticsModel.create({
            retailerId: retailerId
        });

        if(!newAnalytics){
            throw new ApiError(500,"Failed to create new analytics collection.");
        }
    }

    return null;

};

const AnalyticsServices = { 

};

export default AnalyticsServices;