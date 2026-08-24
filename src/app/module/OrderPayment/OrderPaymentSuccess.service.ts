import mongoose from "mongoose";
import { OrderItemModel, OrderModel } from "../Order/Order.model";
import OrderPaymentModel from "./OrderPayment.model";
import { ProductModel } from "../Product/Product.model";
import CartModel from "../Cart/Cart.model";

interface CompleteOrderPayload {
  orderId: string;
  transactionId: string;
  session?: mongoose.ClientSession;
}

export const completeOrderAfterPayment = async (payload: CompleteOrderPayload) => {
  const ownSession = !payload.session;
  const session = payload.session || (await mongoose.startSession());

  try {
    if (ownSession) {
      session.startTransaction();
    }

    // 1. GET ORDER
    const order = await OrderModel.findById(payload.orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    // 2. UPDATE PAYMENT
    await OrderPaymentModel.updateOne(
      {
        transactionId: payload.transactionId,
      },
      {
        status: "SUCCESS",
      },
      { session }
    );

    // 3. UPDATE ORDER STATUS
    order.paymentStatus = "PAID";
    order.orderStatus = "PROCESSING";
    await order.save({ session });

    // 4. GET ORDER ITEMS
    const orderItems = await OrderItemModel.find({
      orderId: order._id,
    }).session(session);

    // 5. REDUCE INVENTORY
    for (const item of orderItems) {
      await ProductModel.updateOne(
        {
          _id: item.productId,
          "sizes.size": item.selectedSize,
        },
        {
          $inc: {
            "sizes.$.stock": -item.quantity,
          },
        },
        { session }
      );
    }

    // 6. MARK CARTS ORDERED
    await CartModel.updateMany(
      {
        buyerId: order.buyerId,
        status: "ACTIVE",
      },
      {
        status: "ORDERED",
      },
      { session }
    );

    if (ownSession) {
      await session.commitTransaction();
    }

    return {
      success: true,
      message: "Order completed successfully",
    };
  } catch (error: any) {
    if (ownSession) {
      await session.abortTransaction();
    }
    throw new Error(error.message);
  } finally {
    if (ownSession) {
      session.endSession();
    }
  }
};
