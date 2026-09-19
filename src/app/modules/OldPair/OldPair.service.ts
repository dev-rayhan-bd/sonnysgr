import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { IOldPair } from "./OldPair.interface";
import OldPairModel from "./OldPair.model";


const addOldPairToResellService = async (userDetail:IJwtPayload, payload: Partial<IOldPair>) => {

    const {profileId} = userDetail;

    //create new order

    const oldPair = await OldPairModel.create({
        buyerId: profileId,
        ...payload
    });

    if(!oldPair){
        throw new ApiError(500,"Failed to add new old pair.");
    }

    //send notification to retailer

};

const OldPairServices = { 
    addOldPairToResellService
};

export default OldPairServices;