import { Schema, model, models } from "mongoose";
import { IBranch } from "./Branch.interface";

const OperationHourSchema = new Schema({
  day: { type: String, required: true },
  openTime: { type: String, default: "09:00 AM" },
  closeTime: { type: String, default: "08:00 PM" },
  isOpen: { type: Boolean, default: true }
}, { _id: false });

const BranchSchema = new Schema<IBranch>({
  parentRetailerId: { type: Schema.Types.ObjectId, ref: "Retailer", required: true },
  profileImage: { type: String, default: "" },
  coverImage: { type: String, default: "" },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  operationHours: { type: [OperationHourSchema], default: [] },
  pickupRules: { type: String, default: "" },
  branchSettings: {
    acceptInAppOrders: { type: Boolean, default: false },
    acceptHoldWithDeposit: { type: Boolean, default: false },
    inStorePickupAvailable: { type: Boolean, default: false }
  },
  inventoryType: { type: String, enum: ["SHARED", "SEPARATE"], default: "SHARED" },
  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

BranchSchema.index({ location: "2dsphere" });

export const BranchModel = models.Branch || model<IBranch>("Branch", BranchSchema);
