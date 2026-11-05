import { model, Schema, models } from "mongoose";
import { ICart } from "./Cart.interface";
import { ENUM_CART_STATUS } from "../../../utilities/enum";

const CartSchema = new Schema<ICart>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    retailerId: { type: Schema.Types.ObjectId, ref: "Retailer", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant" },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    selectedSize: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: Object.values(ENUM_CART_STATUS),
      default: ENUM_CART_STATUS.ACTIVE,
      index: true,
    },
  },
  { timestamps: true }
);

CartSchema.index(
  {
    buyerId: 1,
    productId: 1,
    selectedSize: 1,
    status: 1,
  },
  { background: true }
);

const CartModel = models.Cart || model<ICart>("Cart", CartSchema);

export default CartModel;
