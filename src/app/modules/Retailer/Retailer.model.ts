import { model, Schema, models } from "mongoose";
import { IRetailer } from "./Retailer.interface";
import { STORE_SETTINGS_LIMITS } from "./Retailer.constant";


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
    storeSettings:{
        prepTimeMinutes:{
            type:Number,
            min:STORE_SETTINGS_LIMITS.prepTimeMinutes.min,
            max:STORE_SETTINGS_LIMITS.prepTimeMinutes.max,
            default:STORE_SETTINGS_LIMITS.prepTimeMinutes.default
        },
        holdDurationHours:{
            type:Number,
            min:STORE_SETTINGS_LIMITS.holdDurationHours.min,
            max:STORE_SETTINGS_LIMITS.holdDurationHours.max,
            default:STORE_SETTINGS_LIMITS.holdDurationHours.default
        },
        pickupWindowHours:{
            type:Number,
            min:STORE_SETTINGS_LIMITS.pickupWindowHours.min,
            max:STORE_SETTINGS_LIMITS.pickupWindowHours.max,
            default:STORE_SETTINGS_LIMITS.pickupWindowHours.default
        },
        serviceRadiusMiles:{
            type:Number,
            min:STORE_SETTINGS_LIMITS.serviceRadiusMiles.min,
            max:STORE_SETTINGS_LIMITS.serviceRadiusMiles.max,
            default:STORE_SETTINGS_LIMITS.serviceRadiusMiles.default
        },
    },
    // Visibility boost bought from a BOOST store plan; active while endDate > now
    boost:{
        planId:{type:Schema.Types.ObjectId,ref:"StorePlan",default:null},
        startDate:{type:Date,default:null},
        endDate:{type:Date,default:null,index:true},
    },
    subscription:{type:Schema.Types.ObjectId,ref:"StorePlan"},
    subscriptionStartDate:{type:Date},
    subscriptionEndDate:{type:Date},
    followersCount:{type:Number,default:0},
    averageRating:{type:Number,default:0},
    isApproved:{type:Boolean,default:false},
    // Admin store-review workflow (Module 19.2); isApproved stays in sync for existing consumers
    approvalStatus:{
        type:String,
        enum:["Pending","Under Review","More Info Requested","Approved","Rejected"],
        default:"Pending",
        index:true
    },
    approvalNote:{type:String,default:""},
    approvalUpdatedAt:{type:Date,default:null},
}, { timestamps: true });

//to enable geospatial queries efficiently
RetailerSchema.index({ location: "2dsphere" });

const RetailerModel = models.Retailer || model<IRetailer>("Retailer", RetailerSchema);

export default RetailerModel;