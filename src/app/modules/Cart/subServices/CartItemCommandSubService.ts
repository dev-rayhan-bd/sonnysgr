import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import { ENUM_CART_STATUS, ENUM_PRODUCT_AVAILABILITY } from "../../../../utilities/enum";
import { ProductModel } from "../../Product/Product.model";
import { TCartItem } from "../Cart.interface";
import CartModel from "../Cart.model";

/**
 * Sub-Service dedicated to Cart Item Mutation Commands
 * Handles adding items, size modification, quantity adjustments, and deletions
 */
export class CartItemCommandSubService {
  /**
   * Add a sneaker variant to the buyer's cart with live stock check
   */
  static async addToCart(userDetails: IJwtPayload, payload: TCartItem) {
    const { profileId } = userDetails;
    const { productId, variantId, selectedSize, quantity } = payload;

    if (!productId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "productId is required.");
    }

    if (!selectedSize && !variantId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "selectedSize or variantId is required.");
    }

    if (!quantity || quantity < 1) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Quantity must be at least 1.");
    }

    const product = (await ProductModel.findById(productId).lean()) as any;
    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, "Product not found.");
    }

    if (product.availability !== ENUM_PRODUCT_AVAILABILITY.ACTIVE) {
      throw new AppError(StatusCodes.BAD_REQUEST, "This sneaker is currently not active for purchase.");
    }

    // Match variant by size or variantId
    const variant = product.variant?.find(
      (v: any) =>
        (variantId && String(v._id) === String(variantId)) ||
        (selectedSize && String(v.size) === String(selectedSize))
    );

    if (!variant) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Size ${selectedSize || ""} is not available for this sneaker.`
      );
    }

    const sizeKey = String(variant.size);
    const existingCartItem = await CartModel.findOne({
      buyerId: profileId,
      productId: product._id,
      selectedSize: sizeKey,
      status: ENUM_CART_STATUS.ACTIVE,
    });

    const finalQuantity = existingCartItem ? existingCartItem.quantity + quantity : quantity;
    const availableStock = variant.stock || 0;

    if (availableStock < finalQuantity) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Only ${availableStock} pairs available in size ${sizeKey}. You already have ${
          existingCartItem?.quantity || 0
        } in your cart.`
      );
    }

    const unitPrice = variant.price || product.price;
    const totalPrice = unitPrice * finalQuantity;

    let cartItem;
    if (existingCartItem) {
      existingCartItem.quantity = finalQuantity;
      existingCartItem.totalPrice = totalPrice;
      if (variant._id) existingCartItem.variantId = variant._id;
      cartItem = await existingCartItem.save();
    } else {
      cartItem = await CartModel.create({
        buyerId: new mongoose.Types.ObjectId(profileId),
        productId: product._id,
        retailerId: product.retailerId,
        variantId: variant._id,
        unitPrice,
        quantity,
        totalPrice,
        selectedSize: sizeKey,
        status: ENUM_CART_STATUS.ACTIVE,
      });
    }

    return cartItem;
  }

  /**
   * Update quantity or change size variant of an existing cart item
   */
  static async updateCartItemQuantity(
    userDetails: IJwtPayload,
    payload: { cartItemId: string; quantity?: number; selectedSize?: string | number }
  ) {
    const { profileId } = userDetails;
    const { cartItemId, quantity, selectedSize } = payload;

    if (!cartItemId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "cartItemId is required.");
    }

    const cartItem = await CartModel.findOne({
      _id: cartItemId,
      buyerId: profileId,
      status: ENUM_CART_STATUS.ACTIVE,
    });

    if (!cartItem) {
      throw new AppError(StatusCodes.NOT_FOUND, "Cart item not found or already checked out.");
    }

    const product = (await ProductModel.findById(cartItem.productId).lean()) as any;
    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, "Product associated with this cart item no longer exists.");
    }

    const targetSize = selectedSize !== undefined ? String(selectedSize) : String(cartItem.selectedSize);
    const targetQuantity = quantity !== undefined ? quantity : cartItem.quantity;

    if (targetQuantity < 1) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Quantity must be at least 1.");
    }

    // Locate variant in product
    const variant = product.variant?.find((v: any) => String(v.size) === targetSize);
    if (!variant) {
      throw new AppError(StatusCodes.NOT_FOUND, `Size ${targetSize} is not available.`);
    }

    if (variant.stock < targetQuantity) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Only ${variant.stock} pairs available in size ${targetSize}.`
      );
    }

    // Check if targetSize already exists in another cart item
    if (String(cartItem.selectedSize) !== targetSize) {
      const duplicate = await CartModel.findOne({
        buyerId: profileId,
        productId: product._id,
        selectedSize: targetSize,
        status: ENUM_CART_STATUS.ACTIVE,
        _id: { $ne: cartItem._id },
      });

      if (duplicate) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Size ${targetSize} is already in your cart. Please adjust quantity on that item instead.`
        );
      }
    }

    const unitPrice = variant.price || product.price;
    cartItem.selectedSize = targetSize;
    cartItem.variantId = variant._id;
    cartItem.quantity = targetQuantity;
    cartItem.unitPrice = unitPrice;
    cartItem.totalPrice = unitPrice * targetQuantity;

    await cartItem.save();
    return cartItem;
  }

  /**
   * Delete single item from cart
   */
  static async removeCartItem(userDetails: IJwtPayload, cartItemId: string) {
    const { profileId } = userDetails;

    const result = await CartModel.findOneAndDelete({
      _id: cartItemId,
      buyerId: profileId,
    });

    if (!result) {
      throw new AppError(StatusCodes.NOT_FOUND, "Cart item not found.");
    }

    return null;
  }

  /**
   * Clear all active cart items for the buyer
   */
  static async clearCart(userDetails: IJwtPayload) {
    const { profileId } = userDetails;

    await CartModel.deleteMany({
      buyerId: profileId,
      status: ENUM_CART_STATUS.ACTIVE,
    });

    return null;
  }
}

