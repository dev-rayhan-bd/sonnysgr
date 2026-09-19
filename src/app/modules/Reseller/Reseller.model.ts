import { model, Schema, models } from "mongoose";
import { IReseller } from "./Reseller.interface";

const ResellerSchema = new Schema<IReseller>({
    auth: { type: Schema.Types.ObjectId, required: true, ref: "Auth" },
    badge: { type: String, default: "" },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, default: "" },
    bio: { type: String, default: "" },
    // shoeSize: { type: Number, default: 0 },
    type: { type: String, default: "" },
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
    operationHour: { type: Object, default:{} },
    socialLink:{type:Object,default:{}},
    subscription:{type:Schema.Types.ObjectId,ref:"Subscription"},
    subscriptionStartDate:{type:Date},
    subscriptionEndDate:{type:Date},
    isApproved:{type:Boolean,default:false},
    trustScore: { type: Number, default: 100 },
}, { timestamps: true });

const ResellerModel = models.Reseller || model<IReseller>("Reseller", ResellerSchema);

export default ResellerModel;