import { model, Schema, models } from "mongoose";
import { IPromotion } from "./Promotion.interface";
import { ENUM_PROMOTION_RECEIVER_TYPE, ENUM_PROMOTION_SEND_METHOD, ENUM_PROMOTION_STATUS, ENUM_PROMOTION_TYPE } from "../../../utilities/enum";


const PromotionSchema = new Schema<IPromotion>(
  {
    retailerID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Retailer",
    },

    type: {
      type: String,
      required: true,
      enum: Object.values(ENUM_PROMOTION_TYPE),
      default: ENUM_PROMOTION_TYPE.GENERAL_ANNOUNCEMENT,
    },

    image: {
      type: String,
      default: ""
    },

    title: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    recepient: {
      type: String,
      required: true,
      enum: Object.values(ENUM_PROMOTION_RECEIVER_TYPE),
    },

    sendMethod: {
      type: String,
      required: true,
      enum: Object.values(ENUM_PROMOTION_SEND_METHOD),
    },

    scheduledAt: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number,
      required: true,
      default: 1, // Hours
    },

    startAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(ENUM_PROMOTION_STATUS),
      default: ENUM_PROMOTION_STATUS.DRAFT,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const PromotionModel = models.Promotion || model<IPromotion>("Promotion", PromotionSchema);

export default PromotionModel;