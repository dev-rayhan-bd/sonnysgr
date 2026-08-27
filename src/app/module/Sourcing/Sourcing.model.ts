import { model, Schema, models } from "mongoose";
import { ISourcingRequest, ITrustedReseller } from "./Sourcing.interface";
import { ENUM_GENDER_TYPE } from "../../../utilities/enum";

// TrustedReseller Schema
const TrustedResellerSchema = new Schema<ITrustedReseller>(
  {
    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
    },
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Enforce unique compound index to prevent duplicate relationships
TrustedResellerSchema.index({ retailerId: 1, resellerId: 1 }, { unique: true });

// SourcingRequest Schema
const SourcingRequestSchema = new Schema<ISourcingRequest>(
  {
    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
    },
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
    },
    pairId: {
      type: Schema.Types.ObjectId,
      ref: "Pairs",
      required: true,
    },
    variant: {
      gender: {
        type: String,
        enum: Object.values(ENUM_GENDER_TYPE),
        required: true,
      },
      size: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const TrustedResellerModel =
  models.TrustedReseller ||
  model<ITrustedReseller>("TrustedReseller", TrustedResellerSchema);

const SourcingRequestModel =
  models.SourcingRequest ||
  model<ISourcingRequest>("SourcingRequest", SourcingRequestSchema);

export { TrustedResellerModel, SourcingRequestModel };
