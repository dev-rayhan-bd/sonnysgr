import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import { OrderItemModel, OrderModel } from "./Order.model";
import QueryBuilder from "../../builders/QueryBuilder";
import {
    ENUM_NOTIFICATION_TYPE,
    ENUM_ORDER_STATUS,
    ENUM_ORDER_TYPE,
    ENUM_PAYMENT_STATUS,
    ENUM_PAYMENT_METHOD,
    ENUM_CART_STATUS,
    ENUM_ORDER_ITEM_STATUS,
    ENUM_SELLER_SPLIT_ORDER_STATUS
} from "../../../utilities/enum";
import mongoose from "mongoose";
import { ProductModel } from "../Product/Product.model";
import { completeOrderAfterPayment } from "../OrderPayment/OrderPaymentSuccess.service";
import notification from "../../../helper/notification";
import CartModel from "../Cart/Cart.model";

const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${random}`;
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

interface BuyNowOrderPayload {
    productId: string;
    retailerId: string;
    selectedSize: number;
    quantity: number;
    paymentMethod: string;
    shippingAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        area?: string;
        lat: number;
        lng: number;
    };
    pickupTime: Date;
}

const buyNowOrderService = async (
    userDetails: IJwtPayload,
    payload: BuyNowOrderPayload
) => {
    const { profileId } = userDetails;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // 1. Get Product
        const product: any = await ProductModel.findById(payload.productId).session(session);
        if (!product) {
            throw new ApiError(404, "Product not found");
        }

        // 2. Validate size & stock
        const sizes = product.sizes || product.variant || [];
        const sizeVariant = sizes.find(
            (s: any) => Number(s.size) === Number(payload.selectedSize)
        );

        if (!sizeVariant) {
            throw new ApiError(400, "Selected size unavailable");
        }

        if (sizeVariant.stock < payload.quantity) {
            throw new ApiError(400, "Insufficient stock");
        }

        // 3. Calculate price
        const unitPrice = product.price;
        const subtotal = unitPrice * payload.quantity;
        const shippingCharge = calculateShippingCharge({ subtotal, shippingAddress: payload.shippingAddress });
        const discountAmount = 0;
        const totalAmount = subtotal + shippingCharge - discountAmount;

        // 4. Create main order
        const order = await OrderModel.create([{
            buyerId: profileId,
            orderNumber: generateOrderNumber(),
            subtotal,
            shippingCharge,
            discountAmount,
            totalAmount,
            totalItems: payload.quantity,
            paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
            orderStatus: ENUM_ORDER_STATUS.PLACED,
            paymentMethod: payload.paymentMethod,
            shippingAddress: payload.shippingAddress,
            pickupTime: payload.pickupTime,
            orderType: ENUM_ORDER_TYPE.BUY_NOW,
        }], { session });

        const createdOrder = order[0];

        // 5. Create order item
        await OrderItemModel.create([{
            orderId: createdOrder._id,
            buyerId: profileId,
            retailerId: payload.retailerId,
            productId: payload.productId,
            productSnapshot: {
                name: product.name,
                image: product.images?.[0] || product.image || "",
                brand: product.brand,
            },
            selectedSize: payload.selectedSize,
            quantity: payload.quantity,
            unitPrice,
            totalPrice: subtotal,
            pickupTime: payload.pickupTime,
            status: ENUM_ORDER_ITEM_STATUS.PLACED,
        }], { session });

        // 6. Create seller split order
        // await SellerSplitOrderModel.create([{
        //     orderId: createdOrder._id,
        //     retailerId: payload.retailerId,
        //     buyerId: profileId,
        //     totalItems: payload.quantity,
        //     totalAmount: subtotal,
        //     status: ENUM_SELLER_SPLIT_ORDER_STATUS.PLACED,
        // }], { session });

        // 7. Create payment record
        // const payment = await PaymentModel.create([{
        //     orderId: createdOrder._id,
        //     buyerId: profileId,
        //     amount: totalAmount,
        //     gateway: payload.paymentMethod,
        //     transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        //     status: payload.paymentMethod === "COD" ? "SUCCESS" : "PENDING",
        // }], { session });

        // 8. Auto complete if COD
        // if (payload.paymentMethod === "COD") {
        //     await completeOrderAfterPayment({
        //         orderId: createdOrder._id.toString(),
        //         transactionId: payment[0].transactionId,
        //         session,
        //     });
        // }

        await session.commitTransaction();

        return {
            order: createdOrder,
            // payment: payment[0],
        };

    } catch (error: any) {
        await session.abortTransaction();
        throw new ApiError(error.statusCode || 500, error.message || "Failed to process buy now order");
    } finally {
        session.endSession();
    }
};

interface HoldOrderPayload {
    productId: string;
    retailerId: string;
    selectedSize: number;
    quantity: number;
    paymentMethod: string;
    shippingAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        area?: string;
        lat: number;
        lng: number;
    };
    pickupTime: Date;
    holdingTime: number; // holding time in minutes
    partialPayment: number;
}

const holdOrderService = async (
    userDetails: IJwtPayload,
    payload: HoldOrderPayload
) => {
    const { profileId } = userDetails;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // 1. Get Product
        const product: any = await ProductModel.findById(payload.productId).session(session);
        if (!product) {
            throw new ApiError(404, "Product not found");
        }

        // 2. Validate size & stock
        const sizes = product.sizes || product.variant || [];
        const sizeVariant = sizes.find(
            (s: any) => Number(s.size) === Number(payload.selectedSize)
        );

        if (!sizeVariant) {
            throw new ApiError(400, "Selected size unavailable");
        }

        if (sizeVariant.stock < payload.quantity) {
            throw new ApiError(400, "Insufficient stock");
        }

        // 3. Calculate price
        const unitPrice = product.price;
        const subtotal = unitPrice * payload.quantity;
        const shippingCharge = calculateShippingCharge({ subtotal, shippingAddress: payload.shippingAddress });
        const discountAmount = 0;
        const totalAmount = subtotal + shippingCharge - discountAmount;

        const holdingStartTime = new Date();
        const holdingEndTime = new Date(holdingStartTime.getTime() + payload.holdingTime * 60 * 1000);

        // 4. Create main order with HOLD status details
        const order = await OrderModel.create([{
            buyerId: profileId,
            orderNumber: generateOrderNumber(),
            subtotal,
            shippingCharge,
            discountAmount,
            totalAmount,
            totalItems: payload.quantity,
            paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
            orderStatus: ENUM_ORDER_STATUS.HOLDING,
            paymentMethod: payload.paymentMethod,
            shippingAddress: payload.shippingAddress,
            pickupTime: payload.pickupTime,
            orderType: ENUM_ORDER_TYPE.HOLD,
            holdingTime: payload.holdingTime,
            holdingStartTime,
            holdingEndTime,
            partialPayment: payload.partialPayment,
        }], { session });

        const createdOrder = order[0];

        // 5. Create order item with HOLDING status
        await OrderItemModel.create([{
            orderId: createdOrder._id,
            buyerId: profileId,
            retailerId: payload.retailerId,
            productId: payload.productId,
            productSnapshot: {
                name: product.name,
                image: product.images?.[0] || product.image || "",
                brand: product.brand,
            },
            selectedSize: payload.selectedSize,
            quantity: payload.quantity,
            unitPrice,
            totalPrice: subtotal,
            pickupTime: payload.pickupTime,
            status: ENUM_ORDER_ITEM_STATUS.HOLDING,
        }], { session });

        // 6. Create seller split order
        // await SellerSplitOrderModel.create([{
        //     orderId: createdOrder._id,
        //     retailerId: payload.retailerId,
        //     buyerId: profileId,
        //     totalItems: payload.quantity,
        //     totalAmount: subtotal,
        //     status: ENUM_SELLER_SPLIT_ORDER_STATUS.PLACED,
        // }], { session });

        // 7. Create payment record for the partial payment amount
        // const payment = await PaymentModel.create([{
        //     orderId: createdOrder._id,
        //     buyerId: profileId,
        //     amount: payload.partialPayment,
        //     gateway: payload.paymentMethod,
        //     transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        //     status: ENUM_PAYMENT_STATUS.PENDING,
        // }], { session });

        await session.commitTransaction();

        return {
            order: createdOrder,
            // payment: payment[0],
        };

    } catch (error: any) {
        await session.abortTransaction();
        throw new ApiError(error.statusCode || 500, error.message || "Failed to process hold order");
    } finally {
        session.endSession();
    }
};

interface CartOrderPayload {
    paymentMethod: string;
    shippingAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        area?: string;
        lat: number;
        lng: number;
    };
    pickupTime: Date;
}

const cartOrderService = async (
    userDetails: IJwtPayload,
    payload: CartOrderPayload
) => {
    const { profileId } = userDetails;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // 1. Get Active Carts
        const cartItems = await CartModel.find({
            buyerId: profileId,
            status: ENUM_CART_STATUS.ACTIVE,
        }).session(session);

        if (!cartItems.length) {
            throw new ApiError(400, "Cart is empty");
        }

        // 2. Validate products & stock
        let subtotal = 0;
        let totalItems = 0;
        const orderItemsPayload = [];
        const retailerMap = new Map();

        for (const cartItem of cartItems) {
            const product: any = await ProductModel.findById(cartItem.productId).session(session);
            if (!product) {
                throw new ApiError(404, `Product not found for ID: ${cartItem.productId}`);
            }

            const sizes = product.sizes || product.variant || [];
            const sizeVariant = sizes.find(
                (s: any) => Number(s.size) === Number(cartItem.selectedSize)
            );

            if (!sizeVariant) {
                throw new ApiError(400, `Size ${cartItem.selectedSize} unavailable for ${product.name}`);
            }

            if (sizeVariant.stock < cartItem.quantity) {
                throw new ApiError(400, `Insufficient stock for ${product.name}`);
            }

            const unitPrice = product.price;
            const totalPrice = unitPrice * cartItem.quantity;
            subtotal += totalPrice;
            totalItems += cartItem.quantity;

            orderItemsPayload.push({
                buyerId: profileId,
                retailerId: cartItem.retailerId,
                productId: product._id,
                productSnapshot: {
                    name: product.name,
                    image: product.images?.[0] || product.image || "",
                    brand: product.brand,
                },
                selectedSize: cartItem.selectedSize,
                quantity: cartItem.quantity,
                unitPrice,
                totalPrice,
                pickupTime: payload.pickupTime,
                status: ENUM_ORDER_ITEM_STATUS.PLACED,
            });

            // Group by retailer for split order
            const retailerIdStr = cartItem.retailerId.toString();
            if (!retailerMap.has(retailerIdStr)) {
                retailerMap.set(retailerIdStr, {
                    retailerId: cartItem.retailerId,
                    totalItems: 0,
                    totalAmount: 0,
                });
            }
            const existingRetailer = retailerMap.get(retailerIdStr);
            existingRetailer.totalItems += cartItem.quantity;
            existingRetailer.totalAmount += totalPrice;
        }

        const shippingCharge = calculateShippingCharge({ subtotal, shippingAddress: payload.shippingAddress });
        const discountAmount = 0;
        const totalAmount = subtotal + shippingCharge - discountAmount;

        // 3. Create main order
        const order = await OrderModel.create([{
            buyerId: profileId,
            orderNumber: generateOrderNumber(),
            subtotal,
            shippingCharge,
            discountAmount,
            totalAmount,
            totalItems,
            paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
            orderStatus: ENUM_ORDER_STATUS.PLACED,
            paymentMethod: payload.paymentMethod,
            shippingAddress: payload.shippingAddress,
            pickupTime: payload.pickupTime,
            orderType: ENUM_ORDER_TYPE.BUY_NOW,
        }], { session });

        const createdOrder = order[0];

        // 4. Create order items
        const finalOrderItemsPayload = orderItemsPayload.map((item) => ({
            ...item,
            orderId: createdOrder._id,
        }));
        await OrderItemModel.insertMany(finalOrderItemsPayload, { session });

        // 5. Create seller split orders
        // const sellerSplitOrders = Array.from(retailerMap.values()).map((retailer: any) => ({
        //     orderId: createdOrder._id,
        //     retailerId: retailer.retailerId,
        //     buyerId: profileId,
        //     totalItems: retailer.totalItems,
        //     totalAmount: retailer.totalAmount,
        //     status: ENUM_SELLER_SPLIT_ORDER_STATUS.PLACED,
        // }));
        // await SellerSplitOrderModel.insertMany(sellerSplitOrders, { session });

        // 6. Create payment record
        // const payment = await PaymentModel.create([{
        //     orderId: createdOrder._id,
        //     buyerId: profileId,
        //     amount: totalAmount,
        //     gateway: payload.paymentMethod,
        //     transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        //     status: payload.paymentMethod === "COD" ? "SUCCESS" : "PENDING",
        // }], { session });

        // 7. Update cart items status
        await CartModel.updateMany(
            {
                buyerId: profileId,
                status: ENUM_CART_STATUS.ACTIVE,
                _id: { $in: cartItems.map((item) => item._id) },
            },
            {
                status: ENUM_CART_STATUS.ORDERED,
            },
            { session }
        );

        // 8. Auto complete if COD
        // if (payload.paymentMethod === "COD") {
        //     await completeOrderAfterPayment({
        //         orderId: createdOrder._id.toString(),
        //         transactionId: payment[0].transactionId,
        //         session,
        //     });
        // }

        await session.commitTransaction();

        return {
            order: createdOrder,
            // payment: payment[0],
        };

    } catch (error: any) {
        await session.abortTransaction();
        throw new ApiError(error.statusCode || 500, error.message || "Failed to process cart order");
    } finally {
        session.endSession();
    }
};


//get buyer all order
const getBuyerAllOrder = async (userDetails: IJwtPayload, query: Record<string, unknown>) => {

    const { profileId } = query;

    const { orderStatus } = query;

    const allOrder = await OrderItemModel.find({
        buyerId: profileId,
        status: orderStatus
    }).lean();

    return allOrder;

}


//retailer

//home page

const getRetailerHomePageOrderStatDataService = async (userDetails: IJwtPayload) => {

    const { profileId } = userDetails;



    // Total orders for this retailer
    const totalOrderCount = await OrderItemModel.countDocuments({
        retailerId: profileId
    });

    // Accepted orders for this retailer
    const acceptedOrderCount = await OrderItemModel.countDocuments({
        retailerId: profileId,
        status: ENUM_ORDER_ITEM_STATUS.ACCEPTED
    });

    // Total revenue for this retailer (completed orders)
    const revenueResult = await OrderItemModel.aggregate([
        {
            $match: {
                retailerId: new mongoose.Types.ObjectId(profileId),
                status: ENUM_ORDER_ITEM_STATUS.COMPLETED
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalPrice" }
            }
        }

    ]);
    const revenue = revenueResult[0]?.totalRevenue || 0;
    // let revenue = 0 ;
    // Running low variants (stock <= 5) for this retailer with size information
    // const runningLowVariants = await ProductVariantModel.find({
    //     retailerId: profileId,
    //     isActive: true,
    //     stock: { $lte: 5 }
    // })
    // .populate("productId", "name images price")
    // .lean();
    // let runningLowPairCount = 0;
    // const productRunningLowCount = runningLowVariants.length;
    return {
        totalOrderCount: totalOrderCount || 0,
        acceptedOrderCount: acceptedOrderCount || 0,
        revenue: revenue || 0,
        runningLowPairCount: 0
    }

}





//order page

const retailerAcceptOrderService = async (userDetails: IJwtPayload, orderId: string) => {
    const { profileId } = userDetails;

    // const {orderId,orderStatus} = query;

    const order = await OrderItemModel.findById(orderId);

    if (order.retailerId.toString() !== profileId) {
        throw new ApiError(403, "You can not accept this order.");
    }

    order.status = ENUM_ORDER_STATUS.ACCEPTED;

    await order.save();

    //adjust inventory

    //send notification
    await notification.createNotification({
        toId: order?.buyerId,
        toModel: "Buyer",
        title: "Store keeper accepted your order.",
        description: `Store keeper accepted your order. View the order to check current status.`,
        // message?: string;
        type: ENUM_NOTIFICATION_TYPE.ORDER_ACCEPTED,
        referenceId: order._id,
        referenceModel: "Order",
        metadata: {}
    });
}

const getOrderDetailsById = async (orderId: string) => {
    // const {profileId} = userDetails;

    const order = await OrderItemModel.findById(orderId).lean();

    if (!order) {
        throw new ApiError(404, "Failed to get order details.");
    }

    return order;
}

const createPendingOrderService = async (
  buyerId: string,
  carts: any[],
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    area?: string;
    lat: number;
    lng: number;
  },
  paymentMethod: "STRIPE" | "SSL_COMMERZ" | "BKASH" | "COD",
  session: mongoose.ClientSession
) => {
  const paymentMethodMap: Record<string, string> = {
    STRIPE: ENUM_PAYMENT_METHOD.STRIPE,
    PAYPAL: ENUM_PAYMENT_METHOD.PAYPAL,
    CREDIT_CARD: ENUM_PAYMENT_METHOD.CREDIT_CARD,
    COD: ENUM_PAYMENT_METHOD.STRIPE, // fallback
  };

  const finalPaymentMethod = paymentMethodMap[paymentMethod.toUpperCase()] || ENUM_PAYMENT_METHOD.STRIPE;

  if (!carts.length) {
    throw new ApiError(400, "Cart is empty");
  }

  let subtotal = 0;

  for (const cart of carts) {
    const product: any = cart.productId;

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const sizeVariant = product.sizes?.find(
      (s: any) => String(s.size) === String(cart.selectedSize)
    ) || product.variant?.find(
      (s: any) => String(s.size) === String(cart.selectedSize)
    );

    if (!sizeVariant) {
      throw new ApiError(400, `Size ${cart.selectedSize} unavailable`);
    }

    if (sizeVariant.stock < cart.quantity) {
      throw new ApiError(400, `${product.name} out of stock`);
    }

    cart.unitPrice = product.price;
    cart.totalPrice = product.price * cart.quantity;
    subtotal += cart.totalPrice;
  }

  const shippingCharge = calculateShippingCharge({
    subtotal,
    shippingAddress,
  });

  const discountAmount = 0;
  const totalAmount = subtotal + shippingCharge - discountAmount;

  const order = await OrderModel.create(
    [
      {
        buyerId,
        orderNumber: generateOrderNumber(),
        subtotal,
        shippingCharge,
        discountAmount,
        totalAmount,
        totalItems: carts.length,
        paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
        orderStatus: ENUM_ORDER_STATUS.PLACED,
        paymentMethod: finalPaymentMethod,
        shippingAddress,
        pickupTime: new Date(),
      },
    ],
    { session }
  );

  const createdOrder = order[0];

  const orderItems = carts.map((cart: any) => {
    const product = cart.productId;
    return {
      orderId: createdOrder._id,
      buyerId,
      retailerId: cart.retailerId,
      productId: product._id,
      productSnapshot: {
        name: product.name,
        image: product.images?.[0] || product.image || "",
        brand: product.brand || "",
      },
      selectedSize: cart.selectedSize,
      quantity: cart.quantity,
      unitPrice: cart.unitPrice,
      totalPrice: cart.totalPrice,
      status: "PLACED",
    };
  });

  await OrderItemModel.insertMany(orderItems, { session });

  return createdOrder;
};

const createDirectPendingOrderService = async (
  buyerId: string,
  orderItems: {
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
    selectedSize: number;
  }[],
  shippingAddress: {
    name: string;
    phone: string;
    email?: string | null;
    address: string;
  },
  paymentMethod: "STRIPE" | "SSL_COMMERZ" | "BKASH" | "COD",
  session: mongoose.ClientSession
) => {
  const paymentMethodMap: Record<string, string> = {
    STRIPE: ENUM_PAYMENT_METHOD.STRIPE,
    PAYPAL: ENUM_PAYMENT_METHOD.PAYPAL,
    CREDIT_CARD: ENUM_PAYMENT_METHOD.CREDIT_CARD,
    COD: ENUM_PAYMENT_METHOD.STRIPE, // fallback for schema compliance
  };

  const finalPaymentMethod = paymentMethodMap[paymentMethod.toUpperCase()] || ENUM_PAYMENT_METHOD.STRIPE;

  let subtotal = 0;
  const processedItems = [];

  for (const item of orderItems) {
    const product = (await ProductModel.findById(item.productId).session(session)) as any;
    if (!product) {
      throw new ApiError(404, `Product not found for ID: ${item.productId}`);
    }

    const sizeVariant = product.sizes?.find(
      (s: any) => String(s.size) === String(item.selectedSize)
    ) || product.variant?.find(
      (s: any) => String(s.size) === String(item.selectedSize)
    );

    if (!sizeVariant) {
      throw new ApiError(400, `Size ${item.selectedSize} unavailable for product: ${product.name}`);
    }

    if (sizeVariant.stock < item.quantity) {
      throw new ApiError(400, `${product.name} out of stock for size ${item.selectedSize}`);
    }

    const unitPrice = sizeVariant.price || product.price;
    const itemTotalPrice = unitPrice * item.quantity;
    subtotal += itemTotalPrice;

    processedItems.push({
      retailerId: product.retailerId,
      productId: product._id,
      productSnapshot: {
        name: product.name,
        image: product.images?.[0] || product.image || "",
        brand: product.brand || "",
      },
      selectedSize: item.selectedSize,
      quantity: item.quantity,
      unitPrice,
      totalPrice: itemTotalPrice,
      status: ENUM_ORDER_ITEM_STATUS.PLACED,
    });
  }

  // Schema-compliant address structure: city and lat/lng are default filled since they are missing from user payload
  const finalShippingAddress = {
    name: shippingAddress.name,
    phone: shippingAddress.phone,
    address: shippingAddress.address,
    city: "Default",
    lat: 0,
    lng: 0,
  };

  const shippingCharge = calculateShippingCharge({
    subtotal,
    shippingAddress: finalShippingAddress,
  });

  const discountAmount = 0;
  const totalAmount = subtotal + shippingCharge - discountAmount;

  const order = await OrderModel.create(
    [
      {
        buyerId,
        orderNumber: generateOrderNumber(),
        subtotal,
        shippingCharge,
        discountAmount,
        totalAmount,
        totalItems: orderItems.length,
        paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
        orderStatus: ENUM_ORDER_STATUS.PLACED,
        paymentMethod: finalPaymentMethod,
        shippingAddress: finalShippingAddress,
        pickupTime: new Date(),
      },
    ],
    { session }
  );

  const createdOrder = order[0];

  const finalOrderItems = processedItems.map((item) => ({
    ...item,
    orderId: createdOrder._id,
    buyerId,
  }));

  await OrderItemModel.insertMany(finalOrderItems, { session });

  return createdOrder;
};

const getMyOrdersService = async (buyerId: string, query: Record<string, unknown>) => {
  const baseQuery = OrderModel.find({ buyerId });
  const queryBuilder = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const orders = await queryBuilder.modelQuery.lean();
  const meta = await queryBuilder.countTotal();

  const ordersWithItems = await Promise.all(
    orders.map(async (order: any) => {
      const items = await OrderItemModel.find({ orderId: order._id }).populate("productId").lean();
      return {
        ...order,
        items,
      };
    })
  );

  return {
    meta,
    data: ordersWithItems,
  };
};

const OrderServices = {
    buyNowOrderService,
    holdOrderService,
    cartOrderService,
    getRetailerHomePageOrderStatDataService,
    retailerAcceptOrderService,
    getOrderDetailsById,
    createPendingOrderService,
    createDirectPendingOrderService,
    getMyOrdersService,
};

export default OrderServices;