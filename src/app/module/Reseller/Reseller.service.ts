import ApiError from "../../../error/ApiError";
import notification from "../../../helper/notification";
import { IJwtPayload } from "../../../interface/jwt.interface";
import deleteOldFile from "../../../utilities/deleteFile";
import { ENUM_NOTIFICATION_TYPE, ENUM_PAIR_REQUEST_STATUS, ENUM_USER_Type } from "../../../utilities/enum";
import { IPairRequest } from "../Pairs/Pairs.interface";
import { PairRequestModel, PairsModel } from "../Pairs/Pairs.model";
import { IReseller } from "./Reseller.interface";
import ResellerModel from "./Reseller.model";

const resellerHomePageStatDataService = async (userDetails: IJwtPayload) => {
    const {profileId} = userDetails;

    const activeListingsCount = await PairsModel.countDocuments({resellerId: profileId});
    // const totalListingsCount = await PairsModel.countDocuments({resellerId: profileId});

    const totalStoreRequestsCount = await PairRequestModel.countDocuments({
        resellerId: profileId,
        status: {$in: [ENUM_PAIR_REQUEST_STATUS.PENDING, ENUM_PAIR_REQUEST_STATUS.ACCEPTED]}
    });

    const totalActiveRequestsCount = await PairRequestModel.countDocuments({
        resellerId: profileId,
        status: ENUM_PAIR_REQUEST_STATUS.ACCEPTED
    });

    return { 
        activeListing: activeListingsCount || 0, 
        storeRequest: totalStoreRequestsCount || 0,
        activeDeals: totalActiveRequestsCount || 0,
        monthlyRevenue: 0,
        trustScore: {
            totalDeal: 43,
            completedDeal: 25
        } 
    };
};

//make an offer request to reseller's pair request
const makeRequestForPairService = async (userDetails: IJwtPayload, payload: any) => {
    const {profileId} = userDetails;

    const {pairId, quantity, variant, askingPrice,offerPrice, validityHours, note, dealCompletionType} = payload;

    const pair: any = await PairsModel.findById(pairId).lean();

    if (!pair) {
        throw new ApiError(404, "Pairs not found.");
    }

    if (pair.resellerId.toString() === profileId) {
        throw new ApiError(400, "You cannot make a request for your own pairs.");
    }

    if (pair.quantity < quantity) {
        throw new ApiError(400, "Requested quantity exceeds available quantity.");
    }

    const newPairRequest = new PairRequestModel({
        resellerId: pair?.resellerId,
        retailerId: profileId,
        pairId,
        quantity,
        variant,
        askingPrice: pair?.askingPrice,
        offerHistory: [
            {
                offeredBy: ENUM_USER_Type.RETAILER,
                price: offerPrice,
                // note: note || ""
            }
        ],
        status: ENUM_PAIR_REQUEST_STATUS.PENDING,
        note,
        validity: {
            validForHours: validityHours,
            from: new Date(),
            to: new Date(Date.now() + validityHours * 60 * 60 * 1000)
        },
        // dealCompletionType
    });

    await newPairRequest.save();

    //send notification to the reseller about the new pair request (this can be implemented using a notification service or system)

    return newPairRequest;

};

//retailer profile
const updateResellerProfileService = async (
    userDetails: IJwtPayload,
    file: Express.Multer.File | undefined,
    payload: any
    ) => {

    const { profileId } = userDetails;
    
    let {name,bio,phone,website,address,latitude,longitude} = payload;

    // console.log("profileImage, coverImage", profileImage, coverImage);
    
    const profile:any = await ResellerModel.findById(profileId).lean();
    if (!profile) {
        throw new ApiError(404, "Buyer not found to update.");
    }

    
    const updateData: any = {
        name,
        bio,
        phone,
        website,
        address,
    };
    
    if(file){
        updateData.image = `uploads/profile-image/${file.filename}`;

        deleteOldFile(profile?.image);
    }

    // if(coverImage){
    //     updateData.coverImage = `uploads/cover-image/${profileImage}`;

    //     deleteOldFile(profile?.coverImage);
    // }

    if (latitude != null && longitude != null) {
        updateData["location.coordinates"] = [Number(longitude),Number(latitude)];
    }

    const updatedProfile = await ResellerModel.findByIdAndUpdate(
        profileId,
        {
            $set: updateData,
        },
        {
            new: true,
        }
    );

    

    return updatedProfile;
};

const resellerProfileStatDataService = async (userDetails: IJwtPayload) => {

    const {profileId} = userDetails;

    const myInventory = await PairsModel.find({resellerId: profileId}).sort({createdAt: -1}).select("name images quantity").lean();

    const myCompletedRequests = await PairRequestModel.find({resellerId: profileId, status: ENUM_PAIR_REQUEST_STATUS.ACCEPTED})
        .populate({path: "pairId", select: "name images"})
        .select("pairId quantity variant askingPrice createdAt")
        .sort({createdAt: -1}).lean();

    return{
        completedDeals: myCompletedRequests.length,
        responseRatePercentage: 88,
        totalPairSoldAmount: 5000,
        averageRating: 4.5,
        myInventory,
        myCompletedRequests
    }
}

//dashboard

const getAllResellerService = async (query: Record<string,unknown>) => {

    let {page, searchText} = query;

    //if searchText is true
    if(searchText){
        const users = await ResellerModel.find({
             $or: [
                    { name: { $regex: searchText, $options: "i" } },
                    { email: { $regex: searchText, $options: "i" } },
                ]
        }) .populate({path: "auth", select:"isBlocked"}).lean();

        return users;

    }

    //pagination
    page = parseInt(page as any) || 1;
    let limit = 10;
    let skip = (page as number - 1) * limit;


    const [users, totalUser] = await Promise.all([

        ResellerModel.find({})
            .populate({path: "auth", select:"isBlocked"})
                .sort({createdAt: -1})
                    .skip(skip).limit(limit)
                        .lean(),
    
        ResellerModel.countDocuments({})
    ])

    const totalPage = Math.ceil(totalUser / limit);

    return {
        meta:{page,limit: 10,total: totalUser, totalPage},
        reseller: users
    };
}

const approveResellerService = async (id: string) => {

    const approvedReseller = await ResellerModel.findById(id).select("name isApproved");

    if(!approvedReseller){
        throw new ApiError(404,"Reseller not found.");
    }

    approvedReseller.isApproved = true;
    await approvedReseller.save();

    let msg = approvedReseller.isApproved ? "approved" : "disapproved";

    //send notification to reseller about approval (implementation pending)
    // await notification.createNotification({
    //     toId: id,
    //     toModel: "Reseller",
    //     title: "Account Approved",
    //     description: `Congratulations! Your reseller account has been approved. You can now start listing your pairs and receiving offers from retailers.`,
    //     type: ENUM_NOTIFICATION_TYPE.ACCOUNT_APPROVAL,
    //     referenceId: id,
    //     referenceModel: "Reseller"
    // });

    return msg;
    
}

const ResellerServices = { 
    resellerHomePageStatDataService,
    makeRequestForPairService,
    updateResellerProfileService,
    resellerProfileStatDataService
};


export default ResellerServices;