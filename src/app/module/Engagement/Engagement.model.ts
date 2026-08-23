import { model, Schema, models } from "mongoose";
import {  IFollow, IReview, IUserFollow, IwishList, IFollowProduct } from "./Engagement.interface";

//follow model schema
const FollowSchema = new Schema<IFollow>({
    
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: "Buyer",
    required: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: "Retailer",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

FollowSchema.index({ buyerId: 1, retailerId: 1 },{ unique: true });

//user follow model
const UserFollowSchema = new Schema<IUserFollow>({
    
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "Buyer",
    required: true,
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: "Buyer",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

UserFollowSchema.index({ senderId: 1, receiverId: 1},{unique: true});


//review model schema
const ReviewSchema = new Schema<IReview>({
    
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: "Buyer",
    required: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: "Retailer",
    required: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  overallrating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  customerServiceRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  authenticityRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  pickupSpeedRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  priceRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  storeExperienceRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  staffHelpfulnessRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

//wishlist model schema
const WishListSchema = new Schema<IwishList>({
    
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: "Buyer",
    required: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: "Retailer",
    required: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  isWanted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});


// follow product schema
const FollowProductSchema = new Schema<IFollowProduct>({
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: "Buyer",
    required: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

FollowProductSchema.index({ buyerId: 1, productId: 1 }, { unique: true });

const FollowModel = models.Follow || model<IFollow>("Follow", FollowSchema);

const FollowUserModel = models.FollowUser || model<IUserFollow>("FollowUser", UserFollowSchema);

const ReviewModel = models.Review || model<IReview>("Review", ReviewSchema);

const WishListModel = models.WishList || model<IwishList>("WishList", WishListSchema);

const FollowProductModel = models.FollowProduct || model<IFollowProduct>("FollowProduct", FollowProductSchema);

export { 
    FollowModel,
    FollowUserModel,
    ReviewModel,
    WishListModel,
    FollowProductModel
};