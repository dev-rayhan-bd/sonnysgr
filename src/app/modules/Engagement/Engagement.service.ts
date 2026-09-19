import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import RetailerModel from "../Retailer/Retailer.model";
import { IReview } from "./Engagement.interface";
import { FollowModel, FollowUserModel, ReviewModel, WishListModel } from "./Engagement.model";
import BuyerModel from "../Buyer/Buyer.model";

//follow retailer

const followRetailerService = async (userDetails: IJwtPayload ,retailerId: string) => {

    const { profileId } = userDetails;

    // Check if the follow relationship already exists
    const existingFollow = await FollowModel.findOne({ buyerId: profileId, retailerId }).lean();

    if (existingFollow) {
        throw new ApiError(400, "You are still following this retailer.");
    }

    // Create a new follow relationship
    const newFollow = new FollowModel({
        buyerId: profileId,
        retailerId,
    });

    
    await newFollow.save();

    //increment the followers count of the retailer
    await RetailerModel.findByIdAndUpdate(retailerId, { $inc: { followersCount: 1 } });

    return null;

};

const unfollowRetailerService = async (userDetails: IJwtPayload ,retailerId: string) => {
    
    const { profileId } = userDetails;
    
    // Check if the follow relationship exists
    const existingFollow = await FollowModel.findOne({ buyerId: profileId, retailerId });
    
    if (!existingFollow) {
        throw new ApiError(400, "You are not following this retailer.");
    }
    
    // Remove the follow relationship
    await FollowModel.deleteOne({ buyerId: profileId, retailerId });
    
    // Decrement the followers count of the retailer
    await RetailerModel.findByIdAndUpdate(retailerId, { $inc: { followersCount: -1 } });
    
    return null;
    
}


//follow buyer/user

const followUserService = async (userDetails: IJwtPayload ,receiverId: string) => {

    const { profileId } = userDetails;

    if (profileId === receiverId) {
        throw new ApiError(
        400,
        "You cannot follow yourself"
        );
    }

  // Validate ObjectIds (optional but recommended)
  if (
    !mongoose.Types.ObjectId.isValid(profileId) ||
    !mongoose.Types.ObjectId.isValid(receiverId)
  ) {
    throw new ApiError(
      400,
      "Invalid user id"
    );
  }

  // Check existing follow relationship
  const existingFollow = await FollowUserModel.findOne({
    senderId: profileId,
    receiverId,
  });

//   const existingRelationship = await FollowUserModel.findOne({
//         $or: [
//             { senderId: profileId, receiverId },
//             { senderId: receiverId, receiverId: profileId },
//         ],
//     });

  if (existingFollow) {
    throw new ApiError(
      400,
      "You are already following this user."
    );
  }

  // Create follow
  const follow = await FollowUserModel.create({
    senderId: profileId,
    receiverId,
  });

  return follow;
};

const getNearbyUser = async (query: Record<string,unknown>) => {

    const { latitude, longitude} = query;

    if (typeof latitude !== "number" || typeof longitude !== "number" ) {
        throw new ApiError(400, "Invalid query parameters. Latitude, longitude");
    }

    const maxDistance = 10000; // Set a default max distance (in meters) for nearby retailers

    const nearbyUsers = await BuyerModel.find({
        // isApproved: true, // Only include approved retailers    
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistance,
            },
        },
    }).select("name address shoeSize").lean();

    return nearbyUsers;

    
};

const getAllFollowingUser = async (userDetails: IJwtPayload ) => {

    const { profileId } = userDetails;

    const following = await FollowUserModel.find({senderId: profileId})
        .populate({path:"receiverId", select:"name address shoeSize"})
            .lean();

    return following;
};

const getAllFollower = async (userDetails: IJwtPayload ) => {

    const { profileId } = userDetails;

    const followers = await FollowUserModel.find({receiverId: profileId})
        .populate({path:"senderId", select:"name address shoeSize"})
            .lean();

    return followers;
};

const getFollowUserDetails = async (userId: string) => {

    // const { profileId } = userDetails;

    const user = await BuyerModel.findById(userId)

            .lean();

    return user;
};



//reviewservice to add review and rating for a retailer by a buyer

const addReviewService = async (userDetails: IJwtPayload, payload: IReview) => {

    const { profileId } = userDetails;

    const { retailerId, productId, content, customerServiceRating, authenticityRating, pickupSpeedRating, priceRating, storeExperienceRating, staffHelpfulnessRating } = payload;

    const retailerObjectId = new mongoose.Types.ObjectId(retailerId);

    // Check if the review already exists for the same buyer, retailer and product
    const existingReview = await ReviewModel.findOne({ buyerId: profileId, retailerId, productId });

    if (existingReview) {
        throw new ApiError(400, "You have already reviewed this product for this retailer.");
    }

    //determine the overall rating based on the individual ratings
    const overallRating = Math.round((customerServiceRating + authenticityRating + pickupSpeedRating + priceRating + storeExperienceRating + staffHelpfulnessRating) / 6);

    if (overallRating < 1 || overallRating > 5) {
        throw new ApiError(400, "Overall rating must be between 1 and 5.");
    }


    // Create a new review
    const newReview = await ReviewModel.create({
        buyerId: profileId,
        retailerId,
        productId,
        content,
        overallRating,
        customerServiceRating,
        authenticityRating,
        pickupSpeedRating,
        priceRating,
        storeExperienceRating,
        staffHelpfulnessRating
    });

    // Update the retailer's average rating
    // const reviews = await ReviewModel.find({ retailerId });
    // const totalRating = reviews.reduce((sum, review) => sum + review.overallRating, 0);
    // const averageRating = totalRating / reviews.length;

    // await RetailerModel.findByIdAndUpdate(retailerId, { averageRating });

    await ReviewModel.aggregate([
        {
            $match: {
            retailerId: retailerObjectId,
            },
        },
        {
            $group: {
            _id: "$retailerId",
            averageRating: { $avg: "$overallRating" },
            },
        },
        {
            $merge: {
            into: "retailers", // your retailer collection name
            on: "_id",
            whenMatched: [
                {
                $set: {
                    averageRating: "$averageRating",
                },
                },
            ],
            whenNotMatched: "discard",
            },
        },
    ]);

    return null;

}


// wishlist service to add a product to wishlist of a buyer

const addToWishlistService = async (userDetails: IJwtPayload, payload: { retailerId: string, productId: string }) => {

    const { profileId } = userDetails;

    const { retailerId, productId } = payload;

    // Check if the product is already in the wishlist
    const existingWishlistItem = await WishListModel.findOne({ buyerId: profileId, retailerId, productId });

    if (existingWishlistItem) {
        throw new ApiError(400, "This product is already in your wishlist.");
    }

    // Create a new wishlist item
    const newWishlistItem =  WishListModel.create({
        buyerId: profileId,
        retailerId,
        productId,
    });

    if(!newWishlistItem){
        throw new ApiError(500, "Failed to add product to wishlist.");
    }
    
    return null;

}

const addToWantedlistService = async (wishListId: string) => {

    const wishListItem = await WishListModel.findById(wishListId);

    if(!wishListItem){
        throw new ApiError(404, "Wishlist item not found to make wanted.");
    }

    wishListItem.isWanted = true;

    await wishListItem.save();

    
    
    return null;

}

const removeFromWishlistService = async (wishListId: string) => {

    const wishListItem = await WishListModel.findById(wishListId);

    if(!wishListItem){
        throw new ApiError(404, "Wishlist item not found to remove from wishlist.");
    }

    await WishListModel.findByIdAndDelete(wishListId);

    return null;

}

//get buyer wishlist data
const getBuyerWishList = async (userDetails: IJwtPayload) => {
    const {profileId} = userDetails;

    const wishListProduct = await WishListModel.find({buyerId: profileId, isWanted: false})
        .populate({path:"productId", select: "name images"})
        .sort({createdAt: -1})
            .lean();

    return wishListProduct;
}

//get buyer wishlist data
const getBuyerWantedList = async (userDetails: IJwtPayload) => {
    const {profileId} = userDetails;

    const wishListProduct = await WishListModel.find({buyerId: profileId, isWanted: true})
        .populate({path:"productId", select: "name images"})
        .sort({createdAt: -1})
            .lean();

    return wishListProduct;
}

const EngagementServices = { 
    followRetailerService, 
    unfollowRetailerService ,

    followUserService,
    getNearbyUser,
    getAllFollower,
    getAllFollowingUser,
    getFollowUserDetails,

    addToWishlistService,
    addReviewService,
    addToWantedlistService,
    removeFromWishlistService

};

export default EngagementServices;