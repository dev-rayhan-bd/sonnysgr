import { model, Schema, models } from "mongoose";
import { IPairRequest, IPairs, IProductRequest } from "./Pairs.interface";
import {
  ENUM_GENDER_TYPE,
  ENUM_PAIR_REQUEST_STATUS,
  ENUM_PRODUCT_TYPE,
  ENUM_USER_Type,
} from "../../../utilities/enum";

const PairsSchema = new Schema<IPairs>(
  {
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ENUM_PRODUCT_TYPE),
      default: ENUM_PRODUCT_TYPE.SHOES,
    },
    name: { type: String, required: true },
    images: [{ type: String, default: [] }],
    brand: { type: String, required: true },

    styleCode: { type: String, default: "" },
    details: { type: String, default: "" },
    // color: { type: String, default: "" },
    variant: [
      {
        gender: {
          type: String,
          enum: Object.values(ENUM_GENDER_TYPE),
          required: true,
        },
        size: { type: String, required: true },
        stock: { type: Number, required: true },
      },
    ],
    sneakerAttributes: {
      // modelName: String,
      // releaseYear: Number,
      color: { type: String, default: "" },
      condition: {
        type: String,
        enum: ["New", "Used", "Deadstock"],
        default: "New",
      },
      // upperMaterial: String,
      // soleMaterial: String,
      // closureType: String,
    },

    tshirtAttributes: {
      fit: {
        type: String,
        enum: ["Regular", "Slim", "Oversized", "Relaxed"],
        default: "Regular",
      },
      material: { type: String, default: "" },
      care: {
        type: String,
        default: "",
        // enum: ["CREW_NECK", "V_NECK", "POLO", "ROUND_NECK"],
      },
      season: {
        type: String,
        default: "",
        // enum: ["SHORT_SLEEVE", "LONG_SLEEVE", "SLEEVELESS"],
      },
      // gsm: Number,
    },
    askingPrice: { type: Number, required: true },
    // size: { type: Number, required: true },
    // condition: {
    //     type: String,
    //     enum: ["New", "Never worn", "Worn once", "Worn few times", "Used - Good condition", "Used - Fair condition"],
    //     default: "New"
    // },
    isVisibleToStore: { type: Boolean, default: true },
    isShowAskingPrice: { type: Boolean, default: true },
    isAllowDirectRequest: { type: Boolean, default: true },
    isSold: { type: Boolean, default: false },
    pairViewCount: { type: Number, default: 0 },
    productStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    quantity: { type: Number, default: 1 },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

const pairRequestSchema = new Schema<IPairRequest>(
  {
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
    },
    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
    },
    pairId: { type: Schema.Types.ObjectId, ref: "Pairs", required: true },
    quantity: { type: Number, default: 1 },
    variant: {
      gender: {
        type: String,
        enum: Object.values(ENUM_GENDER_TYPE),
        default: ENUM_GENDER_TYPE.MEN,
      },
      size: { type: String, default: "0" },
    },
    askingPrice: { type: Number, required: true },
    // unitPrice: { type: Number, required: true },
    // totalPrice: { type: Number, required: true },
    offerHistory: [
      {
        offeredBy: {
          type: String,
          enum: Object.values(ENUM_USER_Type),
          required: true,
        },
        price: { type: Number, required: true },
        // note: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: Object.values(ENUM_PAIR_REQUEST_STATUS),
      default: ENUM_PAIR_REQUEST_STATUS.PENDING,
    },
    note: { type: String },
    validity: {
      validForHours: { type: Number, required: true },
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    dealCompletionType: {
      type: String,
      enum: ["Meetup", "Store dropoff", "Shipping", "Direct"],
      default: "Meetup",
    },
  },
  { timestamps: true },
);

const PairsModel = models.Pairs || model<IPairs>("Pairs", PairsSchema);

const PairRequestModel =
  models.PairRequest || model<IPairRequest>("PairRequest", pairRequestSchema);

const productRequestSchema = new Schema<IProductRequest>(
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
    type: {
      type: String,
      enum: Object.values(ENUM_PRODUCT_TYPE),
      required: true,
    },
    name: { type: String, required: true },
    images: [{ type: String, default: [] }],
    brand: { type: String, required: true },
    color: { type: String, default: "" },
    styleCode: { type: String, default: "" },
    variant: [
      {
        gender: {
          type: String,
          enum: Object.values(ENUM_GENDER_TYPE),
          required: true,
        },
        size: { type: String, required: true },
        quantity: { type: Number, required: true },
        offerPrice: { type: Number, required: true },
      },
    ],
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

const ProductRequestModel =
  models.ProductRequest ||
  model<IProductRequest>("ProductRequest", productRequestSchema);

export { PairsModel, PairRequestModel, ProductRequestModel };
