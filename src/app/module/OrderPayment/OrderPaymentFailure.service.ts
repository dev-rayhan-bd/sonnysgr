import mongoose from "mongoose";
import { OrderItemModel, OrderModel } from "../Order/Order.model";
import OrderPaymentModel from "./OrderPayment.model";
import { ProductModel } from "../Product/Product.model";
import { ENUM_PAYMENT_STATUS, ENUM_ORDER_STATUS } from "../../../utilities/enum";

interface ReleaseOrderPayload {
  orderId: string;
  transactionId?: string;
  session?: mongoose.ClientSession;
}

export const releaseOrderReservation = async (payload: ReleaseOrderPayload) => {
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

    // If order is already paid or cancelled, do nothing
    if (order.paymentStatus === ENUM_PAYMENT_STATUS.PAID || order.orderStatus === ENUM_ORDER_STATUS.CANCELLED) {
      if (ownSession) {
        await session.commitTransaction();
      }
      return { success: true, message: "No actions needed" };
    }

    // 2. UPDATE PAYMENT
    if (payload.transactionId) {
      await OrderPaymentModel.updateOne(
        {
          transactionId: payload.transactionId,
        },
        {
          status: "FAILED",
        },
        { session }
      );
    } else {
      await OrderPaymentModel.updateOne(
        {
          orderId: order._id,
        },
        {
          status: "FAILED",
        },
        { session }
      );
    }

    // 3. UPDATE ORDER STATUS
    order.paymentStatus = "FAILED";
    order.orderStatus = "CANCELLED";
    await order.save({ session });

    // 4. GET ORDER ITEMS
    const orderItems = await OrderItemModel.find({
      orderId: order._id,
    }).session(session);

    // 5. RELEASE RESERVED STOCK
    for (const item of orderItems) {
      await ProductModel.updateOne(
        {
          _id: item.productId,
          "variant.size": String(item.selectedSize),
        },
        {
          $inc: {
            "variant.$.reservedStock": -item.quantity,
          },
        },
        { session }
      );
    }

    if (ownSession) {
      await session.commitTransaction();
    }

    return {
      success: true,
      message: "Order reservation released successfully",
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
