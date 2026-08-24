import mongoose from "mongoose";
import Stripe from "stripe";
import OrderPaymentModel from "./OrderPayment.model";
import OrderServices from "../Order/Order.service";
import ApiError from "../../../error/ApiError";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-09-30.acacia" as any,
});

interface CheckoutPayload {
  buyerId: string;
  shippingAddress: {
    name: string;
    phone: string;
    email?: string | null;
    address: string;
  };
  orderItems: {
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
    selectedSize: number;
  }[];
}

export const paymentCheckoutService = async (payload: CheckoutPayload) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Delegate direct pending order creation to Order Module
    const createdOrder = await OrderServices.createDirectPendingOrderService(
      payload.buyerId,
      payload.orderItems,
      payload.shippingAddress,
      "STRIPE",
      session
    );

    // 2. Generate a custom transaction ID
    const transactionId = `TXN-${Date.now()}`;

    // 3. Create payment record
    const payment = await OrderPaymentModel.create(
      [
        {
          orderId: createdOrder._id,
          buyerId: payload.buyerId,
          amount: createdOrder.totalAmount,
          gateway: "STRIPE",
          transactionId,
          status: "PENDING",
        },
      ],
      { session }
    );

    // 4. Create Stripe Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: payload.orderItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Order Purchase - Shoe Size: ${item.selectedSize}`,
          },
          unit_amount: Math.round(item.price * 100), // convert to cents
        },
        quantity: item.quantity,
      })),
      success_url: `http://localhost:5000/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5000/payment-cancel`,
      metadata: {
        orderId: createdOrder._id.toString(),
        transactionId: payment[0].transactionId,
      },
    });

    const paymentLink = stripeSession.url || "";

    // Save Stripe session to gateway response in database
    payment[0].gatewayResponse = stripeSession;
    await payment[0].save({ session });

    await session.commitTransaction();

    return {
      success: true,
      message: "Order placed successfully. Complete payment via link.",
      data: {
        paymentLink,
        paymentBreakdown: {
          subtotal: createdOrder.subtotal,
          shippingCharge: createdOrder.shippingCharge,
          discountAmount: createdOrder.discountAmount,
          totalAmount: createdOrder.totalAmount,
        },
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
