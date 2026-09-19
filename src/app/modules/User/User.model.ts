import { model, models, Schema } from "mongoose";
import { IUser } from "./User.interface";
// import { ENUM_USER_STATUS } from "../../../utilities/enum";



const UserSchema = new Schema<IUser>({
    auth: { type: Schema.Types.ObjectId, ref: "Auth" },
    couple: { type: Schema.Types.ObjectId, ref: "Couple", default: null },
    partner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
        type: String,

        default: ''
    },
    name: {
        type: String,
        default: '',
        required: [true,"Name is required"],
    },
    email: {
        type: String,
        required: [true,"email is required"],
    },
    // phone: {
    //     type: String,
    //     default: ''
    // },
    image: {
        type: String,
        default: ''
    },
    desireMood: {
        imoji: {type: String, default: ''},
        mood: {type: String, default: ''},
    },
    firstMeet:{
        type: Date,
        default: Date.now
    },
    nextMeet:{
        type: Date,
        default: Date.now
    },
    importantDays: [{
        label: {type: String, default: ''},
        image: {type: String, default: ''},
        date: {type: Date, default: Date.now},
    }],
    
    city:{
        type: String,
        default: ''
    },
    // country:{
    //     type: String,
    //     default: ''
    // },
    isLongDistance: {
        type: Boolean,
        default: false
    },
    isConnected: {
        type: Boolean,
        default: false
    },
    subscription: {
        isSubscribed: { type: Boolean, default: false },
        subscriptionId: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", default: null },
        subscriptionName: { type: String, default: '' },
        subscribedAt: { type: Date, default: null },
        expiredAt: { type: Date, default: null }
    },
    
    
}, { timestamps: true });



const UserModel = models.User || model<IUser>("User", UserSchema);

export default UserModel;