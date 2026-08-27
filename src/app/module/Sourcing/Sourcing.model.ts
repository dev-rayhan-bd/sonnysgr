import { model, Schema, models } from "mongoose";
import { ITrustedReseller } from "./Sourcing.interface";

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

const TrustedResellerModel =
  models.TrustedReseller ||
  model<ITrustedReseller>("TrustedReseller", TrustedResellerSchema);

export { TrustedResellerModel };
