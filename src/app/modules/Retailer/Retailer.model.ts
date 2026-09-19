import { model, Schema, models } from "mongoose";
import { IRetailer } from "./Retailer.interface";


const defaultOperationHours = () => [
    { day: "Sunday", openTime: "9:00 AM", closeTime: "10:00 PM", isOpen: true },
    { day: "Monday", openTime: "9:00 AM", closeTime: "10:00 PM", isOpen: true },
    { day: "Tuesday", openTime: "9:00 AM", closeTime: "10:00 PM", isOpen: true },
    { day: "Wednesday", openTime: "9:00 AM", closeTime: "10:00 PM", isOpen: true },
    { day: "Thursday", openTime: "9:00 AM", closeTime: "10:00 PM", isOpen: true },
    { day: "Friday", openTime: "9:00 AM", closeTime: "10:00 PM", isOpen: true },
    { day: "Saturday", openTime: "9:00 AM", closeTime: "10:00 PM", isOpen: true },
];


const RetailerSchema = new Schema<IRetailer>({
    auth: { type: Schema.Types.ObjectId, required: true, ref: "Auth" },
    parentStore: { type: Schema.Types.ObjectId, ref: "Retailer", default: null },
    badge: { type: String, default: "" },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    coverImage: { type: String, default: "" },
    image: { type: String, default: "" },
    license: { type: String, default: "" },
    // shoeSize: { type: Number, default: 0 },
    type: { type: String, default: "" },
    details: { type: String, default: "" },
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
    address: { type: String, default:"" },
    phone: { type: String, default:"" },
    website: { type: String, default:"" },
    operationHour: {
        type: [{
            day: {
                type: String,
                enum: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
                required: true
            },
            openTime: { type: String, default: "9:00 AM" },
            closeTime: { type: String, default: "10:00 PM" },
            isOpen: { type: Boolean, default: true }
        }],
        default: defaultOperationHours
    },
    socialLink:{type:Object,default:{}},
    subscription:{type:Schema.Types.ObjectId,ref:"Subscription"},
    subscriptionStartDate:{type:Date},
    subscriptionEndDate:{type:Date},
    followersCount:{type:Number,default:0},
    averageRating:{type:Number,default:0},
    isApproved:{type:Boolean,default:false},
}, { timestamps: true });

//to enable geospatial queries efficiently
RetailerSchema.index({ location: "2dsphere" });

const RetailerModel = models.Retailer || model<IRetailer>("Retailer", RetailerSchema);

export default RetailerModel;