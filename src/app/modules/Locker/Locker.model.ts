import { model, Schema } from "mongoose";
import { ILockerItem } from "./Locker.interface";

const LockerItemSchema = new Schema<ILockerItem>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    styleCode: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    colorway: {
      type: String,
      default: "",
    },
    size: {
      type: String,
      required: true,
      index: true,
    },
    condition: {
      type: String,
      enum: [
        "Brand New / Deadstock",
        "Like New (9.5/10)",
        "VNDS (9/10)",
        "Good (8/10)",
        "Used / Worn",
      ],
      required: true,
    },
    boxCondition: {
      type: String,
      enum: [
        "Original Box (Good)",
        "Original Box (Damaged)",
        "Replacement Box",
        "No Box",
      ],
      default: "Original Box (Good)",
    },
    accessories: {
      type: [String],
      default: [],
    },
    askingPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "At least one sneaker photo is required.",
      },
    },
    description: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    isAvailableForTradeIn: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["IN_LOCKER", "OFFER_PENDING", "DEAL_ACCEPTED", "SOLD_TO_STORE"],
      default: "IN_LOCKER",
      index: true,
    },
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
    city: {
      type: String,
      default: "",
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for hyper-local store discovery within custom radius
LockerItemSchema.index({ location: "2dsphere" });
LockerItemSchema.index({ buyerId: 1, status: 1 });
LockerItemSchema.index({ isPublic: 1, isAvailableForTradeIn: 1, status: 1 });

export const LockerModel = model<ILockerItem>("Locker", LockerItemSchema);
export default LockerModel;

