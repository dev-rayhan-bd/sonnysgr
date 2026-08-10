import { Schema, model, models } from "mongoose";
import { IDemandEvent } from "./Demand.interface";

const DemandEventSchema = new Schema<IDemandEvent>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      default: null,
    },
    size: {
      type: String,
      default: null,
    },
    eventType: {
      type: String,
      enum: [
        "search",
        "view",
        "size_select",
        "out_of_stock",
        "wishlist",
        "explicit_request",
      ],
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying & geo-spatial aggregation
DemandEventSchema.index({ location: "2dsphere" });
DemandEventSchema.index({ productId: 1, timestamp: -1 });
DemandEventSchema.index({ retailerId: 1, timestamp: -1 });
DemandEventSchema.index({ eventType: 1 });
DemandEventSchema.index({ buyerId: 1, productId: 1, eventType: 1, timestamp: -1 });

const DemandEventModel =
  models.DemandEvent || model<IDemandEvent>("DemandEvent", DemandEventSchema);

export default DemandEventModel;
