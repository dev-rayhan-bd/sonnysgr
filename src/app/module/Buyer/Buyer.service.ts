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

    const { profileId } = userDetails;
    
    let {name,bio,shoeSize,selectedShoeSize,brands,privacy,address,latitude,longitude} = payload;

    // let lat,long;

    // if(latitude && longitude){
    //     lat = Number(latitude);
    //     long = Number(longitude);
    // }
    
    const profile:any = await BuyerModel.findById(profileId).lean();
    if (!profile) {
        throw new ApiError(404, "Buyer not found to update.");
    }

    let buyerProfileImage = "";

    if(file){
        buyerProfileImage = `uploads/profile-image/${file.filename}`;

        deleteOldFile(profile?.image);
    }

    const updateData: any = {
        name,
        bio,
        shoeSize,
        selectedShoeSize,
        brands,
        address,
        privacy,
    };

    if (buyerProfileImage) {
        updateData.image = buyerProfileImage;
    }

    if (latitude != null && longitude != null) {
        updateData["location.coordinates"] = [
            Number(longitude),
            Number(latitude),
        ];
    }

    const updatedProfile = await BuyerModel.findByIdAndUpdate(
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

const BuyerServices = { 
    setBuyerNotificationAlerts,
    addSelectedShoeSize,
    addBrandsOfInterest,
    getBuyersInterestsData,
    updateBuyerProfileService,

    getNearbyProductsForBuyer,
    getBuyersStoreBrandWishlistdataService,
    getBuyerFollowedBrandsProducts,
    getBuyerFollowedRetailersProducts
};

export default BuyerServices;