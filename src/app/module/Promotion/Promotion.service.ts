import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { ENUM_PROMOTION_RECEIVER_TYPE, ENUM_PROMOTION_SEND_METHOD, ENUM_PROMOTION_STATUS } from "../../../utilities/enum";
import { IPromotion } from "./Promotion.interface";
import PromotionModel from "./Promotion.model";
import { FollowModel } from "../Engagement/Engagement.model";
import RetailerModel from "../Retailer/Retailer.model";
import BuyerModel from "../Buyer/Buyer.model";
import cron from "node-cron";


//cron function

export const handleActivePromotion = async () => {

  const now = new Date();

    await PromotionModel.updateMany(
        {
            status: ENUM_PROMOTION_STATUS.SCHEDULED,
            startAt: {
                $lte: now
            }
        },
        {
            $set: {
                status: ENUM_PROMOTION_STATUS.ACTIVE
            }
        }
    );
}

export const handleExpiredPromotion = async () => {

   const now = new Date();

  await PromotionModel.updateMany(
        {
            status: ENUM_PROMOTION_STATUS.ACTIVE,
            expiresAt: {
                $lte: now
            }
        },
        {
            $set: {
                status: ENUM_PROMOTION_STATUS.EXPIRED,
                isActive: false
            }
        }
    );
}

//save draft promotion
const saveDraftPromotion = async ( payload: IPromotion ) => {

  const promotion = await PromotionModel.create({
    ...payload,
    status: ENUM_PROMOTION_STATUS.DRAFT,
    isActive: false
  });

  if(!promotion){
    throw new ApiError(500," failed to create and save promotion draft.");
  }

  return promotion;
};

//schedule promotion
const schedulePromotion = async ( payload: IPromotion ) => {

  const promotion = await PromotionModel.create({
    ...payload,
    startAt : payload.scheduledAt,

    expiresAt : new Date( payload?.scheduledAt.getTime() + payload.duration * 60 * 60 * 1000 ),

    status: ENUM_PROMOTION_STATUS.SCHEDULED,
    isActive: false,
  });

  //run cron job to check for scheduled promotions and send them at the scheduled time. You can use libraries like node-cron or agenda for this purpose. The cron job will update the promotion status to "sending" when it starts sending and then to "sent" or "failed" based on the result of the sending operation.

  return promotion;
};

//send now promotion (you can implement the logic to send the promotion immediately based on your application's architecture, such as sending notifications or emails to the recipients)
const sendNowPromotion = async ( payload: IPromotion ) => {

  const now = new Date();

  
  const promotion = await PromotionModel.create({
    ...payload,
    startAt : now,
    
    expiresAt : new Date( now.getTime() + payload.duration * 60 * 60 * 1000 ),
    
    status : ENUM_PROMOTION_STATUS.ACTIVE
  });

  

  return promotion;
};

//create promotion
const createNewPromotionService = async (userDetails: IJwtPayload, payload: Partial<IPromotion>) => {

    const { profileId } = userDetails;

    payload.retailerID = new mongoose.Types.ObjectId(profileId);

    switch (payload.sendMethod) {

    case ENUM_PROMOTION_SEND_METHOD.SEND_NOW:
      return sendNowPromotion(payload as IPromotion);

    case ENUM_PROMOTION_SEND_METHOD.SCHEDULED:
      return schedulePromotion(payload as IPromotion);

    case ENUM_PROMOTION_SEND_METHOD.SAVE_DRAFT:
      return saveDraftPromotion(payload as IPromotion);

    default: 
        throw new ApiError(400, "Invalid send method" );
  }

    // const newPromotion = await PromotionModel.create({ ...payload, retaileriD: profileId });

    // if (!newPromotion) {
    //     throw new ApiError(500, "Failed to create promotion");
    // }

    // //after creating the promotion, you can implement logic to send notifications to the recipients based on the sendMethod and recepient fields. This might involve integrating with a notification service or sending emails, depending on your application's architecture.   

    // return newPromotion;
};

const editPromotionService = async (
  userDetails: IJwtPayload,
  promotionId: string,
  payload: Partial<IPromotion>
) => {

}

//get promotion
const getAllRetailerPromotion = async (userDetails: IJwtPayload, query: Record<string,unknown>) => {

  const {profileId} = userDetails;
  const {isActive} = query;

  let filter : any = {
    retailerId: profileId,
  }

  if(isActive || !isActive){
    filter.isActive = isActive
  }

  const allPromotion = await PromotionModel.find(filter).lean();

  return allPromotion;

}

const getAllBuyerPromotion = async (userDetails: IJwtPayload, query: Record<string,unknown>) => {

  const {profileId} = userDetails;
  const {latitude,longitude} = query;

  let filter: any = {
    isActive: true,
    sendMethod: ENUM_PROMOTION_SEND_METHOD.SEND_NOW
  }


  const allPromotion = await PromotionModel.find(filter).lean();

}

const PromotionServices = { 
    createNewPromotionService,
    getAllRetailerPromotion,
 };

export default PromotionServices;