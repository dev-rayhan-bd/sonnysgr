import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { ENUM_PRODUCT_AVAILABILITY } from "../../../utilities/enum";
import { OrderItemModel, OrderModel } from "../Order/Order.model";
import { ProductModel } from "../Product/Product.model";
import { IOperationHour, IRetailer } from "./Retailer.interface";
import RetailerModel from "./Retailer.model";
import { ReviewModel } from "../Engagement/Engagement.model";
import deleteOldFile from "../../../utilities/deleteFile";

//get all nearby retailer for buyer 
const filterNearbyRetailers = async (query: Record<string, unknown>) => {
    const { latitude, longitude} = query;

    if (typeof latitude !== "number" || typeof longitude !== "number" ) {
        throw new ApiError(400, "Invalid query parameters. Latitude, longitude");
    }

    const maxDistance = 10000; // Set a default max distance (in meters) for nearby retailers

    const nearbyRetailers = await RetailerModel.find({
        isApproved: true, // Only include approved retailers    
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistance,
            },
        },
    }).select("name").lean();

    return nearbyRetailers;
};

//buyer map page

const getAllNearbyRetailersForMap = async (query: Record<string, unknown>) => {
    const { latitude, longitude } = query;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new ApiError(
            400,
            "Invalid query parameters. Latitude, longitude"
        );
    }

    const maxDistance = 10000;

    const nearbyRetailers = await RetailerModel.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                distanceField: "distance",
                maxDistance,
                spherical: true,
                query: {
                    isApproved: true,
                },
            },
        },

        {
            $lookup: {
                from: "products",
                let: {
                    retailerId: "$_id",
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: [
                                            "$retailerId",
                                            "$$retailerId",
                                        ],
                                    },
                                    {
                                        $eq: [
                                            "$availability",
                                            ENUM_PRODUCT_AVAILABILITY.ACTIVE,
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $count: "total",
                    },
                ],
                as: "productStats",
            },
        },

        {
            $addFields: {
                productCount: {
                    $ifNull: [
                        {
                            $arrayElemAt: [
                                "$productStats.total",
                                0,
                            ],
                        },
                        0,
                    ],
                },
            },
        },

        {
            $project: {
                productStats: 0,
            },
        },

        {
            $project: {
                _id: 1,
                name: 1,
                // image: 1,
                address: 1,
                productCount: 1,
                distance: 1,
            },
        },

        {
            $sort: {
                distance: 1,
            },
        },
        {
            $limit: 10
        },
    ]);

    return nearbyRetailers;
};

const getRetailerDetailWithProduct = async (retailerId: string) => {

    const retailerObjectId = new mongoose.Types.ObjectId(retailerId);

    const retailer = await RetailerModel.findById(retailerId).lean();

    const products = await ProductModel.find({
        retailerId: retailerId,
        availablity: ENUM_PRODUCT_AVAILABILITY.ACTIVE
    }).lean();




    const result = await ReviewModel.aggregate([
    {
        $match: {
            retailerObjectId,
        },
    },

    {
        $facet: {
        // Total review count
        reviewSummary: [
            {
            $group: {
                _id: null,
                totalReviews: { $sum: 1 },

                averageOverallRating: {
                $avg: "$overallrating",
                },

                averageCustomerServiceRating: {
                $avg: "$customerServiceRating",
                },

                averageAuthenticityRating: {
                $avg: "$authenticityRating",
                },

                averagePickupSpeedRating: {
                $avg: "$pickupSpeedRating",
                },

                averagePriceRating: {
                $avg: "$priceRating",
                },

                averageStoreExperienceRating: {
                $avg: "$storeExperienceRating",
                },

                averageStaffHelpfulnessRating: {
                $avg: "$staffHelpfulnessRating",
                },
            },
            },
        ],

        // Star-wise distribution
        ratingDistribution: [
            {
            $group: {
                _id: "$overallrating",
                count: {
                $sum: 1,
                },
            },
            },
            {
            $sort: {
                _id: -1,
            },
            },
        ],
        },
    },
    ]);

    const summary = result[0]?.reviewSummary?.[0];

    const distribution:any = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
    };

    result[0]?.ratingDistribution?.forEach((item:any) => {
        distribution[item._id] = item.count;
    });

    const retailerReview: any = {


        totalReviews: summary?.totalReviews ?? 0,

        overallRating: Number(
            (summary?.averageOverallRating ?? 0).toFixed(1)
        ),

        ratings: distribution,

        customerServiceRating: Number(
            (summary?.averageCustomerServiceRating ?? 0).toFixed(1)
        ),

        authenticityRating: Number(
            (summary?.averageAuthenticityRating ?? 0).toFixed(1)
        ),

        pickupSpeedRating: Number(
            (summary?.averagePickupSpeedRating ?? 0).toFixed(1)
        ),

        priceRating: Number(
            (summary?.averagePriceRating ?? 0).toFixed(1)
        ),

        storeExperienceRating: Number(
            (summary?.averageStoreExperienceRating ?? 0).toFixed(1)
        ),

        staffHelpfulnessRating: Number(
            (summary?.averageStaffHelpfulnessRating ?? 0).toFixed(1)
        ),
    };

    return {
        retailer,
        products,
        retailerReview
    }

}

//get inventory of a retailer
const getRetailerInventory = async (userDetails: IJwtPayload,query: Record<string, unknown>) => {
    const {profileId} = userDetails;

    const {inventoryType} = query


    const inventory = await ProductModel.find({ retailerId: profileId, availability: inventoryType }).sort({ createdAt: -1 }).lean();

    if(!inventory){
        throw new ApiError(404, "Retailer not found.");
    }

    return inventory;

}

const getAllOrdersOfRetailer = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {
    const {profileId} = userDetails;

    const {orderStatus} = query;

    const orders = await OrderItemModel.find({ retailerId: profileId, status: orderStatus }).sort({ createdAt: -1 }).lean();

    if(!orders){
        throw new ApiError(404, "No orders found for this retailer.");
    }

    return orders;
}


//retailer profile

//update retailer operation hours

const toggleOperationHour = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {
    const {profileId} = userDetails;

    const { day } = query;


    const retailer:any = await RetailerModel.findOne({
        _id: profileId,
        // "operationHour.day": day
    });

    // console.log("retailer:", retailer);

    const operationHour = retailer?.operationHour.find( (item:IOperationHour) => item?.day === day);

    // console.log("operation hour:", operationHour);

    operationHour.isOpen = !operationHour.isOpen;

    await retailer.save();

    return null;
};

//retailer profile
const updateRetailerProfileService = async (
    userDetails: IJwtPayload,
    profileImage: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: any
    ) => {

    const { profileId } = userDetails;
    
    let {name,details,phone,website,address,latitude,longitude} = payload;

    console.log("profileImage, coverImage", profileImage, coverImage);
    
    const profile:any = await RetailerModel.findById(profileId).lean();
    if (!profile) {
        throw new ApiError(404, "Buyer not found to update.");
    }

    
    const updateData: any = {
        name,
        details,
        phone,
        website,
        address,
    };
    
    if(profileImage){
        updateData.image = `uploads/profile-image/${profileImage?.filename}`;

        deleteOldFile(profile?.image);
    }

    if(coverImage){
        updateData.coverImage = `uploads/cover-image/${coverImage?.filename}`;

        deleteOldFile(profile?.coverImage);
    }

    if (latitude != null && longitude != null) {
        updateData["location.coordinates"] = [
            Number(longitude),
            Number(latitude),
        ];
    }

    const updatedProfile = await RetailerModel.findByIdAndUpdate(
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

//add rtailer license and store image
const addRetailerLicense = async (
    userDetails: IJwtPayload,
    licenseFile: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: any
    ) => {

    const { profileId } = userDetails;
    
    let {address,latitude,longitude} = payload;

    // console.log("profileImage, coverImage", profileImage, coverImage);
    
    const profile:any = await RetailerModel.findById(profileId).lean();

    if (!profile) {
        throw new ApiError(404, "Retailer not found to add info.");
    }

    
    const updateData: any = {
        address,
    };
    
    if(licenseFile){
        updateData.image = `uploads/retailer-file/${licenseFile?.filename}`;

        // deleteOldFile(profile?.image);
    }

    if(coverImage){
        updateData.coverImage = `uploads/cover-image/${coverImage?.filename}`;

        // deleteOldFile(profile?.coverImage);
    }

    if (latitude != null && longitude != null) {
        updateData["location.coordinates"] = [
            Number(longitude),
            Number(latitude),
        ];
    }

    const updatedProfile = await RetailerModel.findByIdAndUpdate(
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


//retailer home page


//retailer branch
const addNewBranch = async (
    userDetails: IJwtPayload,
    profileImage: Express.Multer.File,
    coverImage: Express.Multer.File,
     payload: Partial<IRetailer>
) => {

    const {authId,profileId} = userDetails;

    // console.log("Retailer branch cover and profile image:",profileImage,coverImage);

    const parentStore:any = await RetailerModel.findById(profileId).select("email").lean();

    const branchPayload: any = {
        parentStore: profileId,
        authId,
        email: parentStore?.email,
       ...payload 
    }

    if(profileImage){
        branchPayload.image = `uploads/profile-image/${profileImage?.filename}`;

        // deleteOldFile(profile?.image);
    }

    if(coverImage){
        branchPayload.coverImage = `uploads/cover-image/${coverImage?.filename}`;

        // deleteOldFile(profile?.coverImage);
    }


    const branch = await RetailerModel.create(branchPayload);

    if(!branch){
        throw new ApiError(500,"Failed to create new branch store.");
    }

    return null;
}

const getAllBranch = async (userDetails: IJwtPayload) => {

    const {profileId} = userDetails;

    const branches = await RetailerModel.find({parentStore: profileId}).lean();

    return branches;

}





//dashboard

const getAllRetailerStoreService = async (query: Record<string,unknown>) => {

    let {page, searchText, approvalStatus} = query;

    let filter: any= {};

    //if approvalStatus is true
    if(approvalStatus){
        filter.isApproved = approvalStatus === "true" ? true : false;
    }

    //if searchText is true
    if(searchText){
        const users = await RetailerModel.find({
            ...filter,
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

        RetailerModel.find(filter)
            .populate({path: "auth", select:"isBlocked"})
                .sort({createdAt: -1})
                    .skip(skip).limit(limit)
                        .lean(),
    
        RetailerModel.countDocuments({})
    ])

    const totalPage = Math.ceil(totalUser / limit);

    return {
        meta:{page,limit: 10,total: totalUser, totalPage},
        stores: users
    };
}

const approveRetailerService = async (id: string) => {

    const approvedRetailer = await RetailerModel.findById(id).select("name isApproved");

    if(!approvedRetailer){
        throw new ApiError(404, "Retailer not found to approve.");
    }

    approvedRetailer.isApproved = !approvedRetailer.isApproved;

    await approvedRetailer.save();

    let msg = approvedRetailer.isApproved ? "approved" : "disapproved";

    //send notification to retailer about approval status
    // await NotificationModel.create({
    //     user: approvedRetailer._id,
    //     title: `Your store has been ${msg}`,
    //     description: `Your store "${approvedRetailer.name}" has been ${msg} by admin. You can now ${approvedRetailer.isApproved ? "start listing your products and receive orders." : "not receive orders until it's approved again."}`,
    //     type: ENUM_NOTIFICATION_TYPE.RETAILER_APPROVAL_STATUS,
    //     referenceId: approvedRetailer._id.toString(),
    //     referenceModel: "Retailer"
    // });

    return msg;
}



const RetailerServices = { 
    filterNearbyRetailers,
    getAllNearbyRetailersForMap,
    getRetailerInventory,
    getAllOrdersOfRetailer,
    toggleOperationHour,

    addNewBranch,
    getAllBranch,

    updateRetailerProfileService,
    addRetailerLicense,
};


export default RetailerServices;