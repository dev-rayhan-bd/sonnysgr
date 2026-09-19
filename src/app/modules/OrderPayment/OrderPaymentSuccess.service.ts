import mongoose from "mongoose";
import { OrderItemModel, OrderModel } from "../Order/Order.model";
import OrderPaymentModel from "./OrderPayment.model";
import { ProductModel } from "../Product/Product.model";
import CartModel from "../Cart/Cart.model";
import { ENUM_CART_STATUS, ENUM_PAYMENT_STATUS, ENUM_ORDER_STATUS } from "../../../utilities/enum";

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

    // Check if order payment is already finalized to ensure it occurs exactly once
    if (order.paymentStatus === ENUM_PAYMENT_STATUS.PAID) {
      if (ownSession) {
        await session.commitTransaction();
      }
      return {
        success: true,
        message: "Order already completed",
      };
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
    order.paymentStatus = ENUM_PAYMENT_STATUS.PAID;
    order.orderStatus = ENUM_ORDER_STATUS.PROCESSING;
    await order.save({ session });

    // 4. GET ORDER ITEMS
    const orderItems = await OrderItemModel.find({
      orderId: order._id,
    }).session(session);

    // 5. REDUCE INVENTORY AND RELEASE RESERVATIONS
    for (const item of orderItems) {
      await ProductModel.updateOne(
        {
          _id: item.productId,
          "variant.size": String(item.selectedSize),
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

    // 6. MARK CARTS ORDERED
    await CartModel.updateMany(
      {
        buyerId: order.buyerId,
        status: ENUM_CART_STATUS.ACTIVE,
      },
      {
        status: ENUM_CART_STATUS.ORDERED,
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
