import { model, Schema, models } from "mongoose";
import { IOldPair } from "./OldPair.interface";
import { ENUM_OLD_PAIR_CONTITION, ENUM_USER_Type } from "../../../utilities/enum";

const OldPairSchema = new Schema<IOldPair>({
    buyerId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    name: { type: String, required: true },
    details: { type: String, default: String },
    images: [{ type: String, required: true }],
    price: { type: Number, required: true, default: 0 },
    offerHistory: [
        {
            offeredBy: { type: String, enum: Object.values(ENUM_USER_Type), required: true },
            price: { type: Number, required: true },
            // note: { type: String },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    brand: { type: String, default: "" , required: true},
    size: { type: String, required: true },
    condition: { 
        type: String, 
        enum: Object.values(ENUM_OLD_PAIR_CONTITION), 
        default: ENUM_OLD_PAIR_CONTITION.DEADSTOCK
    },
    isVisible: { type: Boolean, default: true },
    visiblityDistance: { type: Number, default: 0 }, //km

}, { timestamps: true });

const OldPairModel = models.OldPair || model<IOldPair>("OldPair", OldPairSchema);

export default OldPairModel;