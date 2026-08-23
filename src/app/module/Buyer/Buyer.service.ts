import mongoose, { mongo } from "mongoose";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import deleteOldFile from "../../../utilities/deleteFile";
import { ENUM_PRODUCT_AVAILABILITY } from "../../../utilities/enum";
import { FollowModel, WishListModel } from "../Engagement/Engagement.model";
import RetailerModel from "../Retailer/Retailer.model";
import { IBuyer, IBuyerNotification } from "./Buyer.interface";
import BuyerModel from "./Buyer.model";
import { ProductModel } from "../Product/Product.model";
import AuthModel from "../auth/auth.model";
import QueryBuilder from "../../builders/QueryBuilder";

const setBuyerNotificationAlerts = async (userDetails: IJwtPayload, payload: IBuyerNotification) => {

    const { profileId } = userDetails;

    const buyer:any = await BuyerModel.findById(profileId);

    if (!buyer) {
        throw new ApiError(404, "Buyer not found");
    }

    buyer.notification = {
        ...payload
    };

    await buyer.save();

    return buyer?.notification;
};

const addSelectedShoeSize = async (userDetails: IJwtPayload, payload: { label: string; size: number }[]) => {

    const { profileId } = userDetails;

    if (!payload.length) {
        throw new ApiError(400, "At least one shoe size is required.");
    }

    const buyer:any = await BuyerModel.findById(profileId);

    if (!buyer) {
        throw new ApiError(404, "Buyer not found");
    }

    buyer.shoeSize = payload[0]?.size;
    buyer.selectedShoeSize.push(...payload);

    await buyer.save();

    return buyer?.selectedShoeSize;
}

const addBrandsOfInterest = async (userDetails: IJwtPayload, payload: string[]) => {

    const { profileId } = userDetails;

    const buyer:any = await BuyerModel.findById(profileId);

    if (!buyer) {
        throw new ApiError(404, "Buyer not found");
    }

    buyer.brands.push(...payload);

    await buyer.save();

    return buyer?.brands;
}

const getBuyersInterestsData = async (userDetails: IJwtPayload) => {
    const { profileId } = userDetails;

    let [brands, stores, favourites] = await Promise.all([
        BuyerModel.findById(profileId).select("name shoeSize brands"),
        FollowModel.find({ buyerId: profileId }).populate("retailerId", "name").lean(),
        WishListModel.find({ buyerId: profileId }).populate("productId", "name").lean()
    ]);

    // BuyerModel.findById(profileId).select("name shoeSize brands").lean();

    // const stores = await FollowModel.find({ buyerId: profileId }).populate("retailerId", "name").lean();

    // const favourites = await WishListModel.find({ buyerId: profileId }).populate("productId", "name").lean();

    return {
        brands: brands?.brands || [],
        stores: stores || [],
        favourites: favourites || []
    };
}

const updateBuyerProfileService = async (
    userDetails: IJwtPayload,
    file: Express.Multer.File | undefined,
    payload: any
    ) => {

    const { profileId, authId } = userDetails;
    
    let {name,bio,shoeSize,selectedShoeSize,brands,privacy,address,latitude,longitude} = payload;
    
    const profile:any = await BuyerModel.findById(profileId).lean();
    if (!profile) {
        throw new ApiError(404, "Buyer not found to update.");
    }

    let buyerProfileImage = "";

    if(file){
        buyerProfileImage = `uploads/profile-image/${file.filename}`;

        deleteOldFile(profile?.image);
    }

    // Parse nearby store IDs
    let parsedNearbyStoreIds: string[] = [];
    if (payload["nearby-stores-ids"]) {
        try {
            if (typeof payload["nearby-stores-ids"] === "string") {
                const cleaned = payload["nearby-stores-ids"].trim();
                if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
                    parsedNearbyStoreIds = JSON.parse(cleaned);
                } else {
                    parsedNearbyStoreIds = cleaned.split(",").map((s: string) => s.trim()).filter(Boolean);
                }
            } else if (Array.isArray(payload["nearby-stores-ids"])) {
                parsedNearbyStoreIds = payload["nearby-stores-ids"];
            }
        } catch (e) {
            console.error("Error parsing nearby-stores-ids:", e);
        }
    }

    // Parse selected brands
    let parsedBrands: string[] = [];
    if (payload["selected-brands"]) {
        try {
            if (typeof payload["selected-brands"] === "string") {
                const cleaned = payload["selected-brands"].trim();
                const jsonLike = cleaned.replace(/^[{\[]+/, "[").replace(/[}\]]+$/, "]");
                if (jsonLike.startsWith("[") && jsonLike.endsWith("]")) {
                    try {
                        parsedBrands = JSON.parse(jsonLike);
                    } catch {
                        parsedBrands = jsonLike.slice(1, -1).split(",").map((s: string) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
                    }
                } else {
                    parsedBrands = cleaned.split(",").map((s: string) => s.trim()).filter(Boolean);
                }
            } else if (Array.isArray(payload["selected-brands"])) {
                parsedBrands = payload["selected-brands"];
            }
        } catch (e) {
            console.error("Error parsing selected-brands:", e);
        }
    }

    // Parse notification preferences
    let parsedNotification: any = {};
    if (payload["notification preference"]) {
        try {
            if (typeof payload["notification preference"] === "string") {
                parsedNotification = JSON.parse(payload["notification preference"]);
            } else if (typeof payload["notification preference"] === "object") {
                parsedNotification = payload["notification preference"];
            }
        } catch (e) {
            console.error("Error parsing notification preference:", e);
        }
    }

    const updateData: any = {
        name,
        bio,
        address,
        privacy,
    };

    if (shoeSize !== undefined) {
        updateData.shoeSize = Number(shoeSize);
    }

    if (selectedShoeSize !== undefined) {
        try {
            updateData.selectedShoeSize = typeof selectedShoeSize === "string" ? JSON.parse(selectedShoeSize) : selectedShoeSize;
        } catch {
            updateData.selectedShoeSize = selectedShoeSize;
        }
    }

    if (payload.type !== undefined) {
        updateData.type = payload.type;
    }

    if (parsedBrands.length > 0) {
        updateData.brands = parsedBrands;
    } else if (brands !== undefined) {
        try {
            updateData.brands = typeof brands === "string" ? JSON.parse(brands) : brands;
        } catch {
            updateData.brands = brands;
        }
    }

    if (Object.keys(parsedNotification).length > 0) {
        updateData.notification = {
            ...profile?.notification,
            ...parsedNotification,
        };
    }

    if (buyerProfileImage) {
        updateData.image = buyerProfileImage;
    }

    if (latitude != null && longitude != null) {
        updateData["location.coordinates"] = [
            Number(longitude),
            Number(latitude),
        ];
    }

    // Update Buyer profile
    const updatedProfile = await BuyerModel.findByIdAndUpdate(
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

    // Insert follow records for nearby stores
    if (parsedNearbyStoreIds.length > 0) {
        for (const storeId of parsedNearbyStoreIds) {
            if (mongoose.Types.ObjectId.isValid(storeId)) {
                await FollowModel.findOneAndUpdate(
                    { buyerId: profileId, retailerId: storeId },
                    { buyerId: profileId, retailerId: storeId },
                    { upsert: true, new: true }
                );
            }
        }
    }

    // Set auth isProfileCompleted to true
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



//buyer home page api

const getNearbyProductsForBuyer = async (userDetails: IJwtPayload, query: Record<string,unknown>) => {
    const { productType = 'all' , latitude, longitude } = query; //productType = all,Sneakers,Clothing

    // const { productType = "all", latitude, longitude } = query;

    const maxDistance = 50000; // 50 KM

    const matchStage: any = {
        availability: { $in: [ENUM_PRODUCT_AVAILABILITY.ACTIVE, ENUM_PRODUCT_AVAILABILITY.LOW_STOCK] },
    };

    if (productType !== "all") {
        matchStage.type = productType;
    }

    const products = await RetailerModel.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [
                        Number(longitude),
                        Number(latitude),
                    ],
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
                localField: "_id",
                foreignField: "retailerId",
                as: "products",
                pipeline: [
                    {
                        $match: matchStage,
                    },
                ],
            },
        },

        {
            $unwind: "$products",
        },

        {
            $project: {
                _id: "$products._id",
                retailerId: "$_id",
                retailerName: "$name",
                retailerImage: "$image",
                distance: 1,

                name: "$products.name",
                price: "$products.price",
                images: "$products.images",
                type: "$products.type",
                brand: "$products.brand",
                availability: "$products.availability",
                createdAt: "$products.createdAt",
            },
        },

        {
            $sort: {
                createdAt: - 1,
            },
        },
        {
            $limit: 10
        }
    ]);

    const trendingProduct = await ProductModel.find({}).sort({totalSearchCount: -1}).lean();

    const mostWishlistedProducts = await WishListModel.aggregate([
        {
            $match: {
                isWanted: false,
            },
        },

        {
            $group: {
            _id: "$productId",
            wishlistCount: {
                $sum: 1,
            },
            },
        },

        {
            $sort: {
            wishlistCount: -1,
            },
        },

        {
            $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
            },
        },

        {
            $unwind: "$product",
        },

        {
            $project: {
            _id: "$product._id",
            name: "$product.name",
            brand: "$product.brand",
            price: "$product.price",
            images: "$product.images",
            wishlistCount: 1,
            },
        },
    ]);


    return products;

}

const getBuyersStoreBrandWishlistdataService = async (userDetails: IJwtPayload) => {
    const { profileId } = userDetails;

    const profileObjectId = new mongoose.Types.ObjectId(profileId);

    const pipeline1 = [];
    const pipeline2 = [];

    const [brands, stores, wishlist] = await Promise.all([
        BuyerModel.findById(profileId).select("brands").lean(),

        FollowModel.find({ buyerId: profileId }).populate("retailerId", "name").lean(),

        WishListModel.find({ buyerId: profileId }).populate("productId", "name").lean()
    ]);

    return {
        brands: brands || [],
        stores: stores || [],
        wishlist: wishlist || []
    };
}

const getBuyerFollowedBrandsProducts = async (userDetails: IJwtPayload) => {
    const { profileId } = userDetails;

    // const profileObjectId = new mongoose.Types.ObjectId(profileId);

    const buyer:any = await BuyerModel.findById(profileId).select("brands").lean();

    const products = await ProductModel.find({
        brand: {
            $in: buyer?.brands,
        },
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    // const [brands, stores, wishlist] = await Promise.all([
    //     BuyerModel.findById(profileId).select("brands").lean(),

    //     FollowModel.find({ buyerId: profileId }).populate("retailerId", "name").lean(),

    //     WishListModel.find({ buyerId: profileId }).populate("productId", "name").lean()
    // ]);

    return {
        followedBrandProduct: products,
        // brands: brands || [],
        // stores: stores || [],
        // wishlist: wishlist || []
    };

    
}

const getBuyerFollowedRetailersProducts = async (userDetails: IJwtPayload) => {
    const { profileId } = userDetails;

    // const profileObjectId = new mongoose.Types.ObjectId(profileId);

    const followedRetailers = await FollowModel.find({
            buyerId: profileId,
        })
        .select("retailerId")
        .lean();

    const retailerIds = followedRetailers.map(
        (item) => item.retailerId
        );

    const products = await ProductModel.find({
        retailerId: {
            $in: retailerIds,
        },
        availability: ENUM_PRODUCT_AVAILABILITY.ACTIVE,
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    // const [brands, stores, wishlist] = await Promise.all([
    //     BuyerModel.findById(profileId).select("brands").lean(),

    //     FollowModel.find({ buyerId: profileId }).populate("retailerId", "name").lean(),

    //     WishListModel.find({ buyerId: profileId }).populate("productId", "name").lean()
    // ]);

    return {
        followedRetailerProduct: products,
        // brands: brands || [],
        // stores: stores || [],
        // wishlist: wishlist || []
    };

    
}

// Complete Buyer Profile:
const completeBuyerProfileService = async (
    userDetails?: IJwtPayload,
    email?: string,
    payload?: any
) => {
    let buyerProfile: any;
    let authRecord: any;

    if (userDetails && userDetails.profileId) {
        buyerProfile = await BuyerModel.findById(userDetails.profileId);
        if (userDetails.authId) {
            authRecord = await AuthModel.findById(userDetails.authId);
        }
    } else if (email) {
        buyerProfile = await BuyerModel.findOne({ email: email.toLowerCase() });
        authRecord = await AuthModel.findOne({ email: email.toLowerCase() });
    }

    if (!buyerProfile) {
        throw new ApiError(404, "Buyer profile not found.");
    }

    if (!authRecord) {
        authRecord = await AuthModel.findOne({ email: buyerProfile.email.toLowerCase() });
    }

    if (!authRecord) {
        throw new ApiError(404, "Auth user not found.");
    }

    if (authRecord.role !== "Buyer") {
        throw new ApiError(403, "Access Forbidden: User is not a Buyer.");
    }

    if (authRecord.isProfileCompleted || buyerProfile.isProfileCompleted) {
        throw new ApiError(400, "Profile is already completed.");
    }

    const {
        latitude,
        longitude,
        shoosize,
        type,
        nearbystores,
        notficationprefernce,
        barnads
    } = payload;

    // Update coordinates and fields
    buyerProfile.location = {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)]
    };
    buyerProfile.shoeSize = Number(shoosize);
    buyerProfile.selectedShoeSize = [{ label: shoosize.toString(), size: Number(shoosize) }];
    buyerProfile.type = type;
    buyerProfile.brands = barnads;
    buyerProfile.notification = notficationprefernce;
    buyerProfile.isProfileCompleted = true;

    await buyerProfile.save();

    // Upsert store follows for nearbystores
    if (nearbystores && Array.isArray(nearbystores)) {
        for (const storeId of nearbystores) {
            if (mongoose.Types.ObjectId.isValid(storeId)) {
                await FollowModel.findOneAndUpdate(
                    { buyerId: buyerProfile._id, retailerId: storeId },
                    { buyerId: buyerProfile._id, retailerId: storeId },
                    { upsert: true, new: true }
                );
            }
        }
    }

    // Set auth isProfileCompleted to true
    authRecord.isProfileCompleted = true;
    await authRecord.save();

    return {
        isProfileCompleted: true,
        // profile: buyerProfile
    };
};

const getAllRetailersByBuyer = async (userDetails: IJwtPayload, query: Record<string, any>) => {
    const { profileId } = userDetails;

    // Use QueryBuilder for search, pagination, and sorting on RetailerModel
    const retailerQueryObj = RetailerModel.find();
    const queryBuilder = new QueryBuilder(retailerQueryObj, query)
        .search(["name", "email", "address", "phone"])
        .filter()
        .sort()
        .paginate();

    const retailers = await queryBuilder.modelQuery.lean();
    const meta = await queryBuilder.countTotal();

    // Fetch buyer's followed retailers
    const follows = await FollowModel.find({ buyerId: profileId }).select("retailerId").lean();
    const followedRetailerIds = new Set(follows.map((f: any) => f.retailerId.toString()));

    const data = retailers.map((retailer: any) => ({
        ...retailer,
        isFollowing: followedRetailerIds.has(retailer._id.toString()),
    }));

    return {
        meta,
        data,
    };
};

const getSingleRetailerByBuyer = async (userDetails: IJwtPayload, retailerId: string) => {
    const { profileId } = userDetails;

    if (!mongoose.Types.ObjectId.isValid(retailerId)) {
        throw new ApiError(400, "Invalid retailer ID format");
    }

    const retailer = await RetailerModel.findById(retailerId).lean();
    if (!retailer) {
        throw new ApiError(404, "Retailer not found");
    }

    // Check if buyer follows this retailer
    const follow = await FollowModel.findOne({ buyerId: profileId, retailerId }).lean();

    return {
        ...retailer,
        isFollowing: !!follow,
    };
};

const BuyerServices = { 
    setBuyerNotificationAlerts,
    addSelectedShoeSize,
    addBrandsOfInterest,
    getBuyersInterestsData,
    updateBuyerProfileService,
    completeBuyerProfileService,

    getNearbyProductsForBuyer,
    getBuyersStoreBrandWishlistdataService,
    getBuyerFollowedBrandsProducts,
    getBuyerFollowedRetailersProducts,

    getAllRetailersByBuyer,
    getSingleRetailerByBuyer
};

export default BuyerServices;