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
const createNewPromotionService = async (
  userDetails: IJwtPayload,
  files: Express.Multer.File[] | undefined, 
  payload: Partial<IPromotion>
) => {

    const { profileId } = userDetails;

    payload.retailerID = new mongoose.Types.ObjectId(profileId);

    if (files && files.length > 0) {
      payload.images = files.map(
        (file) => `uploads/promotional-image/${file.filename}`
      );
    }

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
};

const editPromotionService = async (
  userDetails: IJwtPayload,
  files: Express.Multer.File[] | undefined,
  promotionId: string,
  payload: Partial<IPromotion>
) => {

  const {profileId} = userDetails;

  let updateData: any = {
    ...payload
  }

  if (files && files.length > 0) {
    updateData.images = files.map(
      (file) => `uploads/promotional-image/${file.filename}`
    );
  }

  const updatedPromotion = await PromotionModel.findByIdAndUpdate(promotionId,{
    $set: {...updateData}
  }, { new: true });

  if(!updatedPromotion){
    throw new ApiError(500,"Failed to update promotion.");
  }

  return updatedPromotion;

}

//get promotion
const getAllRetailerPromotion = async (userDetails: IJwtPayload, query: Record<string,unknown>) => {

  const {profileId} = userDetails;
  let {isActive,status,page ,limit} = query;

  let filter : any = {
    retailerID: profileId,
  }

  if(isActive !== undefined){
    filter.isActive = isActive
  }

  if(status){
    filter.status = status
  }

  page = parseInt(page as any) || 1;
  limit = parseInt(limit as any) || 10;
  let skip = (page as number - 1) * (limit as number);

  const [promotions, totalPromotion] = await Promise.all([

      PromotionModel.find(filter)
                  .sort({createdAt: -1})
                      .skip(skip).limit(limit as number)
                          .lean(),
  
      PromotionModel.countDocuments(filter)
  ])

  const totalPage = Math.ceil(totalPromotion / (limit as number));

  const hasNextPage = (page as number) < totalPage ? true : false;

  return {
      meta:{
          page,
          limit,
          total: totalPromotion, 
          totalPage,
          hasNextPage
      },
      promotions,
      // pairCount: pairs.length
  };

  // const allPromotion = await PromotionModel.find(filter).lean();

  // return allPromotion;

}

const getAllBuyerPromotion = async (userDetails: IJwtPayload, query: Record<string,unknown>) => {

  const {profileId} = userDetails;
  const {latitude,longitude} = query;

  const profileObjectId = new mongoose.Types.ObjectId(profileId);

  let lat = latitude;
  let lng = longitude;

  if (!lat || !lng) {
    const buyer = (await BuyerModel.findById(profileObjectId).lean()) as any;
    if (buyer && buyer.location && buyer.location.coordinates) {
      lng = buyer.location.coordinates[0];
      lat = buyer.location.coordinates[1];
    }
  }

  if (!lat || !lng) {
    throw new ApiError(400, "Latitude and longitude coordinates are required in query parameters or buyer profile location.");
  }

   const nearbyRetailers = await RetailerModel.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        distanceField: "distance",
        maxDistance: 20 * 1000, // 20 km
        spherical: true,
      },
    },
    {
      $project: {
        _id: 1,
      },
    },
  ]);

  const nearbyRetailerIds = nearbyRetailers.map((r) => r._id);

    const buyerFeed = await PromotionModel.aggregate([

        {
            $match:{
                status:"Active",
                isActive:true
            }
        },

        {
            $lookup:{
                from:"follows",
                let:{
                    retailerId:"$retailerID"
                },
                pipeline:[
                    {
                        $match:{
                            $expr:{
                                $and:[
                                    {
                                        $eq:[
                                            "$buyerId",
                                            profileObjectId
                                        ]
                                    },
                                    {
                                        $eq:[
                                            "$retailerId",
                                            "$$retailerId"
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                as:"follow"
            }
        },

        {
            $addFields:{
                isFollower:{
                    $gt:[
                        {
                            $size:"$follow"
                        },
                        0
                    ]
                },

                isNearby:{
                    $in:[
                        "$retailerID",
                        nearbyRetailerIds
                    ]
                }
            }
        },

        {
            $match:{
                $or:[

                    {
                        $and:[
                            {
                                recepient:"All My Follower"
                            },
                            {
                                isFollower:true
                            }
                        ]
                    },

                    {
                        $and:[
                            {
                                recepient:"Nearby Customer"
                            },
                            {
                                isNearby:true
                            }
                        ]
                    }

                ]
            }
        },

        {
            $project:{
                follow:0
            }
        },

        {
            $sort:{
                createdAt:-1
            }
        }

    ]);

    return buyerFeed;

}

const PromotionServices = { 
    createNewPromotionService,
    editPromotionService,
    getAllRetailerPromotion,
    getAllBuyerPromotion,
 };

export default PromotionServices;