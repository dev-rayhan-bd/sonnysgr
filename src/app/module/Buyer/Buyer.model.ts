import { model, Schema, models } from "mongoose";
import { IBuyer } from "./Buyer.interface";

const BuyerSchema = new Schema<IBuyer>({
    auth: { type: Schema.Types.ObjectId, required: true, ref: "Auth" },
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    image: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    bio: { type: String, default: "" },
    membershipStatus: { type: String, default: "" },
    shoeSize: { type: Number, default: 0 },
    selectedShoeSize: [{
        label: { type: String, default: "" },
        size: { type: Number, default: 0 }
    }],
    brands: { type: [String], default: [] },
    type: { type: String, enum: ["man", "woman", "kid", ""], default: "" },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
        },
    },
    address: { type: String,default:"" },
    notification: { 
        isRestockInMyShoeSize: { type: Boolean, default: false },
        isNearbyStoreAlert: { type: Boolean, default: false },
        isFollowStoreDrops: { type: Boolean, default: false },
        isPriceDrop: { type: Boolean, default: false },
        isWantedPairAlert: { type: Boolean, default: false },
        isGoSneakerAnnouncement: { type: Boolean, default: false },
    },
    privacy: {
        isProfileVisiblityPublic: { type: Boolean, default: true },
        isWishListPublic: { type: Boolean, default: true },
        isPurchaseHistoryPublic: { type: Boolean, default: true },
        isLockerCollectionPublic: { type: Boolean, default: true },
        isVipStatusPublic: { type: Boolean, default: true },
        isActivityPublic: { type: Boolean, default: true },
    },
    myReviews:{type:Number,default:0},
    subscription:{type:Schema.Types.ObjectId,ref:"Subscription"},
    subscriptionStartDate:{type:Date},
    subscriptionEndDate:{type:Date},
    isProfileCompleted: { type: Boolean, default: false },
}, { timestamps: true });

//to enable geospatial queries on the location field, we need to create a 2dsphere index on it. This allows us to perform queries like finding nearby buyers based on their location.
BuyerSchema.index({ location: "2dsphere"});

BuyerSchema.pre("findOneAndDelete", async function (next) {
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
        const buyerId = doc._id;
        
        // Delete related Auth record
        await model("Auth").deleteMany({ profile: buyerId });

        // Delete Follow records
        await model("Follow").deleteMany({ buyerId });

        // Delete WishList records
        await model("WishList").deleteMany({ buyerId });

        // Delete Cart records
        await model("Cart").deleteMany({ buyerId });
    }
    next();
});

const BuyerModel = models.Buyer || model<IBuyer>("Buyer", BuyerSchema);

export default BuyerModel;