import { model, Schema, models } from "mongoose";
import { IFollow, IReview, IUserFollow, IwishList, IFollowProduct } from "./Engagement.interface";

// Follow model schema
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
  alertPreferences: {
    newArrivals: { type: Boolean, default: true },
    exclusiveDrops: { type: Boolean, default: true },
    flashSales: { type: Boolean, default: false },
    restocks: { type: Boolean, default: true },
    isCustomized: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

FollowSchema.index({ buyerId: 1, retailerId: 1 }, { unique: true });

// User follow model
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

UserFollowSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

// Review model schema
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

// Wishlist model schema (Module 11)
const WishListSchema = new Schema<IwishList>({
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: "Buyer",
    required: true,
    index: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: "Retailer",
    index: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  isWanted: {
    type: Boolean,
    default: false,
    index: true,
  },
  desiredSize: {
    type: Schema.Types.Mixed,
    default: null,
  },
  notifyOnRestock: {
    type: Boolean,
    default: true,
  },
  notifyOnPriceDrop: {
    type: Boolean,
    default: true,
  },
  targetPrice: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

WishListSchema.index({ buyerId: 1, productId: 1, desiredSize: 1 });

// Follow product schema
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
