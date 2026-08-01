import { model, Schema, models } from "mongoose";
import { IDrop } from "./Drop.interface";

const DropSchema = new Schema<IDrop>(
  {
    dropImages: { type: [String], default: [] },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    realeaseDate: { type: Date, required: true },
    time: { type: String, required: true },
    timezone: { type: String, required: true },
    vipEalryAccess: { type: Boolean, default: false },
    earlyMinustes: { type: Number, default: 0 },
    raffledrop: { type: Boolean, default: false },
    maximumEntries: { type: Number, default: 0 },
    stockAvailablity: {
      availablePairs: { type: Number, default: 0 },
      estimatedDemand: { type: String, default: "" },
      staus: {
        type: String,
        enum: ["upcomming", "live", "closed"],
        default: "upcomming",
      },
    },
  },
  { timestamps: true }
);

const DropModel = models.Drop || model<IDrop>("Drop", DropSchema);

export default DropModel;
