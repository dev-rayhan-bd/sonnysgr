import mongoose from "mongoose";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import {
  ENUM_CART_STATUS,
  ENUM_ORDER_ITEM_STATUS,
  ENUM_ORDER_STATUS,
  ENUM_ORDER_TYPE,
  ENUM_PAYMENT_STATUS,
  ENUM_PRODUCT_AVAILABILITY,
} from "../../../../utilities/enum";
import CartModel from "../Cart.model";
import { ProductModel } from "../../Product/Product.model";
import { OrderItemModel, OrderModel } from "../../Order/Order.model";
import { ProductInventorySubService } from "../../Product/subServices/ProductInventorySubService";
import { TCheckoutCartPayload } from "../Cart.interface";

/**
 * Sub-Service dedicated to Promo Application & Multi-Vendor Cart Checkout
 * Orchestrates atomic transactions, inventory deduction, and pickup verification codes
 */
export class CartCheckoutSubService {
  /**
   * Apply promotional voucher / discount code
   */
  static async applyPromoCode(
    userDetails: IJwtPayload,
    promoCode: string,
    retailerId?: string
  ) {
    const { profileId } = userDetails;

    if (!promoCode || !promoCode.trim()) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Promo code is required.");
    }

    const code = promoCode.trim().toUpperCase();

    // Fetch active cart items
    const cartItems = await CartModel.find({
      buyerId: profileId,
      status: ENUM_CART_STATUS.ACTIVE,
    }).lean();

    if (!cartItems.length) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Your cart is empty.");
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate discount based on recognized campaign promo codes
    let discountPercent = 0;
    let fixedDiscount = 0;

    if (code === "WELCOME10") {
      discountPercent = 10;
    } else if (code === "GOSNKR20") {
      discountPercent = 20;
    } else if (code === "FREEDROP") {
      fixedDiscount = 15;
    } else {
      throw new AppError(StatusCodes.BAD_REQUEST, `Invalid or expired promo code: ${code}`);
    }

    const discountAmount = discountPercent > 0
      ? Math.round((subtotal * discountPercent) / 100 * 100) / 100
      : Math.min(fixedDiscount, subtotal);

    const discountedTotal = Math.max(0, subtotal - discountAmount);

    return {
      promoCode: code,
      discountPercent,
      discountAmount,
      originalSubtotal: subtotal,
      discountedTotal,
    };
  }

  /**
   * Complete multi-store Cart Checkout with atomic stock deduction
   */
  static async checkoutCart(userDetails: IJwtPayload, payload: TCheckoutCartPayload) {
    const { profileId } = userDetails;
    const {
      shippingAddress,
      fulfillmentType = "DELIVERY",
      pickupTime,
      paymentMethod = "CARD",
      promoCode,
      notes,
    } = payload;

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // 1. Fetch active cart items
      const cartItems = await CartModel.find({
        buyerId: profileId,
        status: ENUM_CART_STATUS.ACTIVE,
      }).session(session);

      if (!cartItems.length) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Cart is empty. Cannot proceed to checkout.");
      }

      let subtotal = 0;
      let totalItems = 0;
      const orderItemsPayload: any[] = [];

      // 2. Validate stock and prepare items
      for (const cartItem of cartItems) {
        const product = await ProductModel.findById(cartItem.productId).session(session);
        if (!product) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "One or more sneakers in your cart are no longer available."
          );
        }

        if (product.availability !== ENUM_PRODUCT_AVAILABILITY.ACTIVE) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `${product.name} is currently not available for purchase.`
          );
        }

        const sizeStr = String(cartItem.selectedSize);
        const variant = product.variant?.find((v: any) => String(v.size) === sizeStr);

        if (!variant) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `Size ${sizeStr} for ${product.name} is no longer available.`
          );
        }

        if (variant.stock < cartItem.quantity) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `Only ${variant.stock} pairs available for ${product.name} in size ${sizeStr}.`
          );
        }

        const itemTotal = cartItem.unitPrice * cartItem.quantity;
        subtotal += itemTotal;
        totalItems += cartItem.quantity;

        // Atomically deduct inventory
        await ProductInventorySubService.adjustSizeStock(
          String(product._id),
          sizeStr,
          -cartItem.quantity,
          0,
          session
        );

        orderItemsPayload.push({
          buyerId: new mongoose.Types.ObjectId(profileId),
          retailerId: cartItem.retailerId,
          productId: product._id,
          productSnapshot: {
            name: product.name,
            image: product.images?.[0] || "",
            brand: product.brand,
          },
          selectedSize: cartItem.selectedSize,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitPrice,
          totalPrice: itemTotal,
          pickupTime: pickupTime || new Date(),
          status: ENUM_ORDER_ITEM_STATUS.PLACED,
        });
      }

      // 3. Compute Financial Breakdown
      const shippingCharge = fulfillmentType === "STORE_PICKUP" ? 0 : 12.95;
      let discountAmount = 0;

      if (promoCode) {
        const upperCode = promoCode.trim().toUpperCase();
        if (upperCode === "WELCOME10") discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
        else if (upperCode === "GOSNKR20") discountAmount = Math.round(subtotal * 0.2 * 100) / 100;
        else if (upperCode === "FREEDROP") discountAmount = Math.min(15, subtotal);
      }

      const tax = Math.round((subtotal - discountAmount) * 0.08 * 100) / 100; // 8% sales tax
      const totalAmount = Math.max(0, subtotal + shippingCharge + tax - discountAmount);

      const timestamp = Date.now().toString().slice(-6);
      const orderNumber = `GS-ORD-${timestamp}-${Math.floor(100 + Math.random() * 900)}`;

      // Generate 6-digit in-store pickup code if store pickup
      const pickupCode = `GS-PICKUP-${Math.floor(100000 + Math.random() * 900000)}`;

      // 4. Create Parent Order Record
      const [order] = await OrderModel.create(
        [
          {
            buyerId: new mongoose.Types.ObjectId(profileId),
            orderNumber,
            subtotal,
            shippingCharge,
            discountAmount,
            totalAmount,
            totalItems,
            orderStatus: ENUM_ORDER_STATUS.PLACED,
            orderType: ENUM_ORDER_TYPE.BUY_NOW,
            paymentStatus: ENUM_PAYMENT_STATUS.PAID,
            paymentMethod,
            shippingAddress: shippingAddress || {
              name: "Customer",
              phone: "N/A",
              address: fulfillmentType === "STORE_PICKUP" ? "In-Store Boutique Pickup" : "Delivery",
              city: "Local",
              lat: 0,
              lng: 0,
            },
            pickupTime: pickupTime || new Date(),
          },
        ],
        { session }
      );

      // 5. Create Child Order Items
      const finalItems = orderItemsPayload.map((item) => ({
        ...item,
        orderId: order._id,
      }));

      const createdItems = await OrderItemModel.insertMany(finalItems, { session });

      // 6. Mark cart items as ORDERED
      await CartModel.updateMany(
        {
          buyerId: profileId,
          status: ENUM_CART_STATUS.ACTIVE,
          _id: { $in: cartItems.map((c) => c._id) },
        },
        { status: ENUM_CART_STATUS.ORDERED },
        { session }
      );

      await session.commitTransaction();

      return {
        order,
        orderItems: createdItems,
        pickupCode: fulfillmentType === "STORE_PICKUP" ? pickupCode : undefined,
        message: "Order placed successfully.",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
