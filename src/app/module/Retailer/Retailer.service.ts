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
import AuthModel from "../auth/auth.model";

//get all nearby retailer for buyer 
const filterNearbyRetailers = async (query: Record<string, unknown>) => {
    const { latitude, longitude } = query;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
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

    const distribution: any = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
    };

    result[0]?.ratingDistribution?.forEach((item: any) => {
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
const getRetailerInventory = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {
    const { profileId } = userDetails;

    let { type, availability, page, limit } = query

    let filter: any = {
        retailerId: profileId
    };

    if (availability) {
        const availabilityStr = String(availability).toLowerCase().replace(/[-_]/g, ' ');
        let mappedAvailability = availability;

        if (availabilityStr === 'in stock' || availabilityStr === 'instock') {
            mappedAvailability = ENUM_PRODUCT_AVAILABILITY.IN_STOCK;
        } else if (availabilityStr === 'low stock' || availabilityStr === 'lowstock') {
            mappedAvailability = ENUM_PRODUCT_AVAILABILITY.LOW_STOCK;
        } else if (availabilityStr === 'coming soon' || availabilityStr === 'comming soon' || availabilityStr === 'comingsoon' || availabilityStr === 'commingsoon') {
            mappedAvailability = ENUM_PRODUCT_AVAILABILITY.COMING_SOON;
        } else if (availabilityStr === 'in retailer' || availabilityStr === 'inretailer' || availabilityStr === 'active') {
            mappedAvailability = ENUM_PRODUCT_AVAILABILITY.ACTIVE;
        } else if (availabilityStr === 'on hold' || availabilityStr === 'onhold') {
            mappedAvailability = ENUM_PRODUCT_AVAILABILITY.ON_HOLD;
        } else if (availabilityStr === 'sold out' || availabilityStr === 'soldout') {
            mappedAvailability = ENUM_PRODUCT_AVAILABILITY.SOLD_OUT;
        }

        filter.availability = mappedAvailability;
    }

    if (type) {
        filter.type = type
    }

    page = parseInt(page as any) || 1;
    limit = parseInt(limit as any) || 10;
    let skip = (page as number - 1) * (limit as number);

    const [products, totalProducts, statusCountsResult] = await Promise.all([

        ProductModel.find(filter)
            .select("-sneakerAttributes -tshirtAttributes")
            .sort({ createdAt: -1 })
            .skip(skip).limit(limit as number)
            .lean(),

        ProductModel.countDocuments(filter),

        ProductModel.aggregate([
            { $match: { retailerId: new mongoose.Types.ObjectId(profileId) } },
            {
                $project: {
                    totalStock: {
                        $reduce: {
                            input: "$variant",
                            initialValue: 0,
                            in: { $add: ["$$value", { $ifNull: ["$$this.stock", 0] }] }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    all: { $sum: 1 },
                    inStock: {
                        $sum: {
                            $cond: [{ $gte: ["$totalStock", 5] }, 1, 0]
                        }
                    },
                    lowStock: {
                        $sum: {
                            $cond: [{ $and: [{ $gt: ["$totalStock", 0] }, { $lt: ["$totalStock", 5] }] }, 1, 0]
                        }
                    },
                    outOfStock: {
                        $sum: {
                            $cond: [{ $eq: ["$totalStock", 0] }, 1, 0]
                        }
                    }
                }
            }
        ])
    ])

    const counts = statusCountsResult[0] ? {
        all: statusCountsResult[0].all || 0,
        inStock: statusCountsResult[0].inStock || 0,
        lowStock: statusCountsResult[0].lowStock || 0,
        outOfStock: statusCountsResult[0].outOfStock || 0
    } : { all: 0, inStock: 0, lowStock: 0, outOfStock: 0 };

    const totalPage = Math.ceil(totalProducts / (limit as number));

    const hasNextPage = (page as number) < totalPage ? true : false;

    return {
        meta: {
            page,
            limit,
            total: totalProducts,
            totalPage,
            hasNextPage,
            counts
        },
        products,
    };


    const inventory = await ProductModel.find(filter).sort({ createdAt: -1 }).lean();

    if (!inventory) {
        throw new ApiError(404, "Retailer not found.");
    }

    return inventory;

}

const getAllOrdersOfRetailer = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {
    const { profileId } = userDetails;

    const { orderStatus } = query;

    const orders = await OrderItemModel.find({ retailerId: profileId, status: orderStatus }).sort({ createdAt: -1 }).lean();

    if (!orders) {
        throw new ApiError(404, "No orders found for this retailer.");
    }

    return orders;
}


//retailer profile

//update retailer operation hours

const toggleOperationHour = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {
    const { profileId } = userDetails;

    const { day } = query;


    const retailer: any = await RetailerModel.findOne({
        _id: profileId,
        // "operationHour.day": day
    });

    // console.log("retailer:", retailer);

    const operationHour = retailer?.operationHour.find((item: IOperationHour) => item?.day === day);

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
    licence: Express.Multer.File | undefined,
    payload: any
) => {

    const { profileId, authId } = userDetails;

    let { name, details, phone, website, address, latitude, longitude } = payload;

    console.log("profileImage, coverImage, licence", profileImage, coverImage, licence);

    const profile: any = await RetailerModel.findById(profileId).lean();
    if (!profile) {
        throw new ApiError(404, "Retailer not found to update.");
    }


    const updateData: any = {
        name,
        details,
        phone,
        website,
        address,
    };

    if (profileImage) {
        updateData.image = `uploads/profile-image/${profileImage?.filename}`;

        deleteOldFile(profile?.image);
    }

    if (coverImage) {
        updateData.coverImage = `uploads/cover-image/${coverImage?.filename}`;

        deleteOldFile(profile?.coverImage);
    }

    if (licence) {
        updateData.license = `uploads/retailer-file/${licence?.filename}`;

        deleteOldFile(profile?.license);
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

    if (!updatedProfile) {
        throw new ApiError(500, "Failed to update profile.");
    }

    if (authId) {
        const auth = await AuthModel.findById(authId);
        if (auth && !auth.isProfileCompleted) {
            auth.isProfileCompleted = true;
            await auth.save();
        }
    }

    return {
        isProfileCompleted: true,
        profile: updatedProfile
    };
};

//add rtailer license and store image
const addRetailerLicense = async (
    userDetails: IJwtPayload,
    licenseFile: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: any
) => {

    const { profileId } = userDetails;

    let { address, latitude, longitude } = payload;

    // console.log("profileImage, coverImage", profileImage, coverImage);

    const profile: any = await RetailerModel.findById(profileId).lean();

    if (!profile) {
        throw new ApiError(404, "Retailer not found to add info.");
    }


    const updateData: any = {
        address,
    };

    if (licenseFile) {
        updateData.image = `uploads/retailer-file/${licenseFile?.filename}`;

        // deleteOldFile(profile?.image);
    }

    if (coverImage) {
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


//dashboard

const getAllRetailerStoreService = async (query: Record<string, unknown>) => {

    let { page, searchText, approvalStatus } = query;

    let filter: any = {};

    //if approvalStatus is true
    if (approvalStatus) {
        filter.isApproved = approvalStatus === "true" ? true : false;
    }

    //if searchText is true
    if (searchText) {
        const users = await RetailerModel.find({
            ...filter,
            $or: [
                { name: { $regex: searchText, $options: "i" } },
                { email: { $regex: searchText, $options: "i" } },
            ]
        }).populate({ path: "auth", select: "isBlocked" }).lean();

        return users;

    }


    //pagination
    page = parseInt(page as any) || 1;
    let limit = 10;
    let skip = (page as number - 1) * limit;


    const [users, totalUser] = await Promise.all([

        RetailerModel.find(filter)
            .populate({ path: "auth", select: "isBlocked" })
            .sort({ createdAt: -1 })
            .skip(skip).limit(limit)
            .lean(),

        RetailerModel.countDocuments({})
    ])

    const totalPage = Math.ceil(totalUser / limit);

    return {
        meta: { page, limit: 10, total: totalUser, totalPage },
        stores: users
    };
}

const approveRetailerService = async (id: string) => {

    const approvedRetailer = await RetailerModel.findById(id).select("name isApproved");

    if (!approvedRetailer) {
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

const completeRetailerProfileService = async (
    userDetails?: IJwtPayload,
    email?: string,
    files?: {
        "profile-image"?: Express.Multer.File[];
        "cover-image"?: Express.Multer.File[];
        "licence"?: Express.Multer.File[];
    },
    payload?: any
) => {
    let retailerProfile: any;
    let authRecord: any;

    if (userDetails && userDetails.profileId) {
        retailerProfile = await RetailerModel.findById(userDetails.profileId);
        if (userDetails.authId) {
            authRecord = await AuthModel.findById(userDetails.authId);
        }
    } else if (email) {
        retailerProfile = await RetailerModel.findOne({ email: email.toLowerCase() });
        authRecord = await AuthModel.findOne({ email: email.toLowerCase() });
    }

    if (!retailerProfile) {
        throw new ApiError(404, "Retailer profile not found.");
    }

    if (!authRecord) {
        authRecord = await AuthModel.findOne({ email: retailerProfile.email.toLowerCase() });
    }

    if (!authRecord) {
        throw new ApiError(404, "Auth user not found.");
    }

    if (authRecord.role !== "Retailer") {
        throw new ApiError(403, "Access Forbidden: User is not a Retailer.");
    }

    if (authRecord.isProfileCompleted) {
        throw new ApiError(400, "Profile is already completed.");
    }

    // Validate and extract files
    const profileImage = files?.["profile-image"]?.[0];
    const coverImage = files?.["cover-image"]?.[0];
    const licence = files?.["licence"]?.[0];

    if (!licence) {
        throw new ApiError(400, "Business license file (licence) is required.");
    }

    if (!profileImage) {
        throw new ApiError(400, "Profile image (profile-image) is required.");
    }

    if (!coverImage) {
        throw new ApiError(400, "Cover image (cover-image) is required.");
    }

    const { latitude, longitude } = payload;

    // Update coordinates and files
    retailerProfile.location = {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)]
    };

    retailerProfile.image = `uploads/profile-image/${profileImage.filename}`;
    retailerProfile.coverImage = `uploads/profile-image/${coverImage.filename}`;
    retailerProfile.license = `uploads/profile-image/${licence.filename}`;
    
    await retailerProfile.save();

    authRecord.isProfileCompleted = true;
    await authRecord.save();

    return {
        isProfileCompleted: true,
        profile: retailerProfile
    };
};

const RetailerServices = {
    filterNearbyRetailers,
    getAllNearbyRetailersForMap,
    getRetailerInventory,
    getAllOrdersOfRetailer,
    toggleOperationHour,

    updateRetailerProfileService,
    addRetailerLicense,
    completeRetailerProfileService,
};


export default RetailerServices;