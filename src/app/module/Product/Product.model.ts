import { model, Schema, models } from "mongoose";
import { IProduct, IProductVariant, IRecentSearch } from "./Product.interface";
import { ENUM_GENDER_TYPE, ENUM_PRODUCT_AVAILABILITY, ENUM_PRODUCT_TYPE } from "../../../utilities/enum";
import { getAvailability } from "../../middlewares/mongooseMiddleware";


//Product schema
const ProductSchema = new Schema<IProduct>({
  retailerId: { type: Schema.Types.ObjectId, required: true, ref: "Retailer" },
  type: { type: String, enum: Object.values(ENUM_PRODUCT_TYPE), default: ENUM_PRODUCT_TYPE.SNEAKERS },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  images: { type: [String], default: [] },
  brand: { type: String, default: "" },
  variant: [
    {
      gender: {
        type: String,
        enum: Object.values(ENUM_GENDER_TYPE),
        required: true,
      },
      size: { type: String, required: true },
      stock: { type: Number, required: true },
    }
  ],

  // color: { type: String, default: "" },
  styleCode: { type: String, default: "" },
  sneakerAttributes: {
    // modelName: String,
    // releaseYear: Number,
    colorway: { type: String, default: "" },
    condition: {
      type: String,
      enum: ["New", "Used", "Deadstock",],
    },
    // upperMaterial: String,
    // soleMaterial: String,
    // closureType: String,
  },

  tshirtAttributes: {
    fit: {
      type: String,
      enum: ["Regular", "Slim", "Oversized", "Relaxed"],
    },
    material: { type: String, default: "" },
    care: {
      type: String,
      default: ""
      // enum: ["CREW_NECK", "V_NECK", "POLO", "ROUND_NECK"],
    },
    season: {
      type: String,
      default: ""
      // enum: ["SHORT_SLEEVE", "LONG_SLEEVE", "SLEEVELESS"],
    },
    // gsm: Number,
  },
  availability: { type: String, enum: Object.values(ENUM_PRODUCT_AVAILABILITY), default: ENUM_PRODUCT_AVAILABILITY.ACTIVE },
  totalSearchCount: { type: Number, default: 0 },
}, { timestamps: true });

// Pre-save middleware to set availability based on stock
// ProductSchema.pre("save", function (next) {
//     this.availability = getAvailability(this.variant);
//     next();
// });

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    retailerId: {
      type: Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
    },

    size: {
      type: String,
      required: true,
    },

    color: {
      type: String,
      // required: true,
      default: ""
    },

    sku: {
      type: String,
      // required: true,
      // unique: true,
      default: null
    },

    price: {
      type: Number,
      default: 0,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
    },

    reservedStock: {
      type: Number,
      // required: true,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


//recent search schema
const RecentSearchSchema = new Schema<IRecentSearch>(
  {
    buyerId: {
      type: String,
      required: true,
      index: true,
    },

    keyword: {
      type: String,
      required: true,
    },

    searchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  //   {
  //     timestamps: true,
  //   }
);


const ProductModel = models.Product || model<IProduct>("Product", ProductSchema);

const ProductVariantModel = models.ProductVariant || model<IProductVariant>("ProductVariant", ProductVariantSchema);

const RecentSearchModel = models.RecentSearch || model<IRecentSearch>("RecentSearch", RecentSearchSchema);

export {
  ProductModel,
  ProductVariantModel,
  RecentSearchModel
};

// export  ProductModel;