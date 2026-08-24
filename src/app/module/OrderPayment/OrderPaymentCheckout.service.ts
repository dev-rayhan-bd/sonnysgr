import mongoose from "mongoose";
import CartModel from "../Cart/Cart.model";
import OrderPaymentModel from "./OrderPayment.model";
import { completeOrderAfterPayment } from "./OrderPaymentSuccess.service";
import OrderServices from "../Order/Order.service";
import ApiError from "../../../error/ApiError";

interface CheckoutPayload {
  buyerId: string;
  paymentMethod: "STRIPE" | "SSL_COMMERZ" | "BKASH" | "COD";
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    area?: string;
    lat: number;
    lng: number;
  };
}

export const paymentCheckoutService = async (payload: CheckoutPayload) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Fetch active cart items
    const carts = await CartModel.find({
      buyerId: payload.buyerId,
      status: "ACTIVE",
    })
      .populate("productId")
      .session(session);

    if (!carts || carts.length === 0) {
      throw new ApiError(400, "Cart is empty");
    }

    // 2. Delegate pending order creation to Order Module
    const createdOrder = await OrderServices.createPendingOrderService(
      payload.buyerId,
      carts,
      payload.shippingAddress,
      payload.paymentMethod,
      session
    );

    // 3. Create payment record
    const payment = await OrderPaymentModel.create(
      [
        {
          orderId: createdOrder._id,
          buyerId: payload.buyerId,
          amount: createdOrder.totalAmount,
          gateway: payload.paymentMethod,
          transactionId: `TXN-${Date.now()}`,
          status: payload.paymentMethod === "COD" ? "SUCCESS" : "PENDING",
        },
      ],
      { session }
    );

    // 4. Auto-complete order status if Cash On Delivery (COD)
    if (payload.paymentMethod === "COD") {
      await completeOrderAfterPayment({
        orderId: createdOrder._id.toString(),
        transactionId: payment[0].transactionId,
        session,
      });
    }

    await session.commitTransaction();

    return {
      success: true,
      message: "Checkout successful",
      data: {
        order: createdOrder,
        payment: payment[0],
      },
    };
  } catch (error: any) {
    await session.abortTransaction();
    throw new ApiError(error.statusCode || 500, error.message);
  } finally {
    session.endSession();
  }
};

export const OrderPaymentCheckoutServices = {
  paymentCheckoutService,
};

export default OrderPaymentCheckoutServices;
