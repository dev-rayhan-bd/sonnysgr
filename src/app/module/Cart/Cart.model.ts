import { model, Schema, models } from "mongoose";
import { ICart } from "./Cart.interface";
import { ENUM_CART_STATUS } from "../../../utilities/enum";

const CartSchema = new Schema<ICart>({
   buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
   productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
   retailerId: { type: Schema.Types.ObjectId, ref: "Retailer", required: true },
   variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
   unitPrice: { type: Number, required: true },
   quantity: { type: Number, required: true },
   totalPrice: { type: Number, required: true },
   selectedSize: { type: Number, required: true },
   status: { type: String, enum: Object.values(ENUM_CART_STATUS), default: ENUM_CART_STATUS.ACTIVE },
}, { timestamps: true });

CartSchema.index({
    buyerId: 1,
    variantId: 1,
}, { unique: true });

const CartModel = models.Cart || model<ICart>("Cart", CartSchema);

export default CartModel;