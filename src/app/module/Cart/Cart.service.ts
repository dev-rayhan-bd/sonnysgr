import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { ENUM_CART_STATUS, ENUM_PRODUCT_AVAILABILITY, ENUM_PAYMENT_METHOD, ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS, ENUM_ORDER_TYPE, ENUM_PAYMENT_STATUS } from "../../../utilities/enum";
import {ProductModel} from "../Product/Product.model";
import { ICart, TCartItem } from "./Cart.interface";
import CartModel from "./Cart.model";
import { profile } from "console";
import { OrderItemModel, OrderModel } from "../Order/Order.model";

const addToCartService = async (userDetails: IJwtPayload, payload: TCartItem) => {

    const { profileId } = userDetails;

    const { productId, quantity, selectedSize } = payload;

    if (!quantity || quantity < 1) {
        throw new Error("Quantity must be at least 1");
    }

    const product: any = await ProductModel.findById(productId).lean();

    if (!product) {
        throw new Error("Product not found to add to cart");
    }

    const sizeInfo = product.variant?.find(
        (item: any) => String(item.size) === String(selectedSize)
    );

    if (!sizeInfo) {
        throw new Error("Selected size is not available");
    }

    const availableStock = sizeInfo.stock;

    const existingCartItem = await CartModel.findOne({
        buyerId: profileId,
        productId,
        selectedSize,
        status: ENUM_CART_STATUS.ACTIVE,
    });

    if (existingCartItem) {
        throw new ApiError(400, "This product with the selected size is already in your cart.");
    }

    if (availableStock < quantity) {
        throw new Error(`Only ${availableStock} items are available for this size`);
    }

    const unitPrice = product.price;
    const totalPrice = unitPrice * quantity;

    const cartItem = await CartModel.create({
        buyerId: profileId,
        productId,
        retailerId: product.retailerId,
        selectedSize,
        quantity,
        unitPrice,
        totalPrice,
        status: ENUM_CART_STATUS.ACTIVE,
    });

    return cartItem;
};

const getMyCartService = async (buyerId: string) => {
  const cartItems = await CartModel.find({
    buyerId: new mongoose.Types.ObjectId(buyerId),
    status: ENUM_CART_STATUS.ACTIVE,
  })
    .populate({path:"productId", select:"name price images brand color styleCode variant"})
    .populate({path:"retailerId", select:"name"})
    .sort({ createdAt: -1 });

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + item.totalPrice;
  }, 0);

  const totalItems = cartItems.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  return {
    cartItems,
    summary: {
      subtotal,
      totalItems,
    },
  };
};

const deleteCartItemService = async (userDetails: IJwtPayload, cartItemId: string) => {
    
    const { profileId } = userDetails;
    
    const cartItem = await CartModel.findOne({ _id: cartItemId, buyerId: profileId });
    
    if (!cartItem) {
            throw new ApiError(404, "Cart item not found.");
        }
        
        await CartModel.deleteOne({ _id: cartItemId });
        

    return null;

};

const increaseCartItemQuantityService = async (userDetails: IJwtPayload, payload: { cartItemId: string, quantity?: number, selectedSize?: number }) => {

    const { profileId } = userDetails;
    const { cartItemId, quantity, selectedSize } = payload;

    const cartItem = await CartModel.findOne({
        _id: cartItemId,
        buyerId: profileId,
        status: ENUM_CART_STATUS.ACTIVE,
    });

    if (!cartItem) {
        throw new ApiError(404, "Cart item not found");
    }

    const product = await ProductModel.findById(cartItem.productId);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    let targetSize = cartItem.selectedSize;

    if (selectedSize !== undefined && selectedSize !== cartItem.selectedSize) {
        const sizeInfo = product.variant?.find(
            (item: any) => String(item.size) === String(selectedSize)
        );

        if (!sizeInfo) {
            throw new Error("Selected size is not available for this product");
        }

        const duplicateItem = await CartModel.findOne({
            buyerId: profileId,
            productId: cartItem.productId,
            selectedSize: selectedSize,
            status: ENUM_CART_STATUS.ACTIVE,
            _id: { $ne: cartItem._id },
        });

        if (duplicateItem) {
            throw new ApiError(400, "This product with the selected size is already in your cart.");
        }

        targetSize = selectedSize;
    }

    let targetQuantity = cartItem.quantity;

    if (quantity !== undefined) {
        if (quantity < 1) {
            throw new Error("Quantity must be at least 1");
        }
        targetQuantity = quantity;
    }

    const sizeInfo = product.variant?.find(
        (item: any) => String(item.size) === String(targetSize)
    );

    if (!sizeInfo) {
        throw new Error("Selected size is no longer available");
    }

    const availableStock = sizeInfo.stock - (sizeInfo.reservedStock || 0);

    if (availableStock < targetQuantity) {
        throw new Error(`Only ${availableStock} items are available`);
    }

    cartItem.selectedSize = targetSize;
    cartItem.quantity = targetQuantity;
    cartItem.unitPrice = product.price;
    cartItem.totalPrice = product.price * targetQuantity;

    await cartItem.save();

    return cartItem;
};

const applypromoCodeService = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {

    const { profileId } = userDetails;

    let totalPriceSum = 0;

    // Validate promo code and calculate discount
    
    // This is a placeholder implementation, you should replace it with your actual promo code validation logic
    const discountpercent = 10; // Assuming a flat $10 discount for demonstration

    // Fetch all cart items for the user
    const cartItems = await CartModel.find({ buyerId: profileId, status: ENUM_CART_STATUS.ACTIVE });

    if (cartItems.length === 0) {
        throw new ApiError(400, "No items in the cart to apply promo code.");
    }

    // Apply discount to all totalPrice at a time, you can modify this logic to apply discount based on your requirements
    for (const item of cartItems) {
        totalPriceSum += item.totalPrice;
    }

    const discountedTotalPrice = totalPriceSum - (totalPriceSum * discountpercent / 100);

    return  discountedTotalPrice ;

}

const placeOrderFromCartService = async (userDetails: IJwtPayload,payload: {totalPrice: number,shippingFee: number}) => {

    const { profileId } = userDetails;

    // Fetch all cart items for the user
    const cartItems = await CartModel.find({ buyerId: profileId, status: ENUM_CART_STATUS.ACTIVE });

    if (cartItems.length === 0) {
        throw new ApiError(400, "No items in the cart to place an order.");
    }

    // Here you can implement the logic to create orders based on the cart items
    // For example, you can loop through the cart items and create an order for each item or group them into a single order

    // After placing the order(s), you can update the cart items' status to "Ordered" or remove them from the cart
    await CartModel.updateMany({ buyerId: profileId, status: ENUM_CART_STATUS.ACTIVE }, { status: ENUM_CART_STATUS.ORDERED });  

    return null;

}


type TShippingAddress = {
  name: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  lat: number;
  lng: number;
};

type TCheckoutCartPayload = {
//   buyerId: string;
  shippingAddress: TShippingAddress;
  pickupTime: Date;
  paymentMethod: string;
};

const calculateShippingCharge = ({
  subtotal,
  shippingAddress,
}: {
  subtotal: number;
  shippingAddress: any;
}) => {
  if (subtotal >= 5000) {
    return 0;
  }

  if (shippingAddress.city === "Dhaka") {
    return 80;
  }

  return 150;
};

export const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);

  return `ORD-${timestamp}-${random}`;
};

const checkoutAllCartItemsService = async (userDetails: IJwtPayload, payload: TCheckoutCartPayload) => {

    const {profileId} = userDetails;

    const { shippingAddress, pickupTime, paymentMethod } = payload;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const cartItems = await CartModel.find({
      buyerId: profileId,
      status: ENUM_CART_STATUS.ACTIVE,
    }).session(session);

    if (!cartItems.length) {
      throw new ApiError(400, "Cart is empty. Cannot proceed to checkout.");
    }

    let subtotal = 0;
    let totalItems = 0;

    const orderItemsPayload = [];

    for (const cartItem of cartItems) {
      const product = await ProductModel.findById(cartItem.productId).session(session);

      if (!product) {
        throw new ApiError(400, "One or more products are no longer available");
      }

    //   if (!product.isActive) {
    //     throw new ApiError(400, `${product.name} is no longer active`);
    //   }

      const sizeInfo = product.variant?.find(
        (item: any) => item.size === cartItem.selectedSize
      );

      if (!sizeInfo) {
        throw new ApiError(400, `${product.name} selected size is no longer available`);
      }

    //   const availableStock = sizeInfo.stock - (sizeInfo.reservedStock || 0);
         const availableStock = sizeInfo.stock;

      if (availableStock < cartItem.quantity) {
        throw new ApiError(400, `Only ${availableStock} items available for ${product.name}, size ${cartItem.selectedSize}`);
      }

      const unitPrice = product.price;
      const totalPrice = unitPrice * cartItem.quantity;

      subtotal += totalPrice;
      totalItems += cartItem.quantity;

      orderItemsPayload.push({
        buyerId:profileId,
        retailerId: cartItem.retailerId,
        productId: product._id,
        productSnapshot: {
          name: product.name,
          image: product.images?.[0] || product.image,
          brand: product.brand,
        },
        selectedSize: cartItem.selectedSize,
        quantity: cartItem.quantity,
        unitPrice,
        totalPrice,
        pickupTime,
        status: ENUM_ORDER_ITEM_STATUS.PLACED,
      });

      /**
       * Reserve stock during checkout.
       * This prevents another buyer from purchasing the same stock
       * while payment is pending.
       */
      const updatedProduct = await ProductModel.findOneAndUpdate(
        {
          _id: product._id,
          "variant.size": cartItem.selectedSize,
          $expr: {
            $gte: [
              {
                $subtract: [
                  {
                    $getField: {
                      field: "stock",
                      input: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$sizes",
                              as: "s",
                              cond: {
                                $eq: ["$$s.size", cartItem.selectedSize],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                  },
                  {
                    $ifNull: [
                      {
                        $getField: {
                          field: "reservedStock",
                          input: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$sizes",
                                  as: "s",
                                  cond: {
                                    $eq: ["$$s.size", cartItem.selectedSize],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
              cartItem.quantity,
            ],
          },
        },
        {
          $inc: {
            "sizes.$.reservedStock": cartItem.quantity,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedProduct) {
        throw new Error(
          `Stock changed while checking out ${product.name}. Please try again.`
        );
      }
    }

    const shippingCharge = calculateShippingCharge({
      subtotal,
      shippingAddress,
    });

    const discountAmount = 0;

    const totalAmount = subtotal + shippingCharge - discountAmount;

    const holdingTime = 15; // minutes
    const holdingStartTime = new Date();
    const holdingEndTime = new Date(
      holdingStartTime.getTime() + holdingTime * 60 * 1000
    );

    const order = await OrderModel.create(
      [
        {
          buyerId:profileId,
          orderNumber: generateOrderNumber(),

          subtotal,
          shippingCharge,
          discountAmount,
          totalAmount,
          totalItems,

          orderStatus: ENUM_ORDER_STATUS.PLACED,
          orderType: ENUM_ORDER_TYPE.BUY_NOW,
          paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
          paymentMethod,

          shippingAddress,

          holdingTime,
          holdingStartTime,
          holdingEndTime,

          pickupTime,
        },
      ],
      { session }
    );

    const orderId = order[0]._id;

    const finalOrderItemsPayload = orderItemsPayload.map((item) => ({
      ...item,
      orderId,
    }));

    await OrderItemModel.insertMany(finalOrderItemsPayload, { session });

    await CartModel.updateMany(
      {
        buyerId: profileId,
        status: ENUM_CART_STATUS.ACTIVE,
        _id: {
          $in: cartItems.map((item) => item._id),
        },
      },
      {
        status: ENUM_CART_STATUS.ORDERED,
      },
      { session }
    );

    await session.commitTransaction();

    return {
      order: order[0],
      message: "Cart checkout created successfully. Continue payment.",
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


const confirmCartOrderPaymentService = async (orderId: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await OrderModel.findById(orderId).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.paymentStatus === ENUM_PAYMENT_STATUS.PAID) {
      await session.commitTransaction();
      return order;
    }

    const orderItems = await OrderItemModel.find({ orderId }).session(session);

    for (const item of orderItems) {
      await ProductModel.updateOne(
        {
          _id: item.productId,
          "variant.size": item.selectedSize,
        },
        {
          $inc: {
            "variant.$.stock": -item.quantity,
            "variant.$.reservedStock": -item.quantity,
          },
        },
        { session }
      );
    }

    order.paymentStatus = ENUM_PAYMENT_STATUS.PAID;
    order.orderStatus = ENUM_ORDER_STATUS.PLACED;

    await order.save({ session });

    await session.commitTransaction();

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const CartServices = { 
    addToCartService,
    getMyCartService,
    deleteCartItemService,
    increaseCartItemQuantityService,
    applypromoCodeService,
    placeOrderFromCartService
};

export default CartServices;