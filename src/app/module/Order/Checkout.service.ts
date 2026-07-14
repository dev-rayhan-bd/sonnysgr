// checkout.service.ts
import mongoose, { Types } from "mongoose";
import CartModel from "../Cart/Cart.model";
import { OrderItemModel, OrderModel } from "./Order.model";
import { PaymentModel } from "../Payment/Payment.model";
import { completeOrderAfterPayment } from "../Payment/PaymentSuccess.service";

interface CheckoutPayload {
    buyerId: string;

    paymentMethod:
    | "STRIPE"
    | "SSL_COMMERZ"
    | "BKASH"
    | "COD";

    shippingAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        area?: string;
    };
}

export const checkoutService = async (
    payload: CheckoutPayload
) => {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        // =====================================================
        // 1. GET ACTIVE CARTS
        // =====================================================

        const carts = await CartModel.find({
            buyerId: payload.buyerId,
            status: "ACTIVE",
        }).populate("productId").session(session);

        if (!carts.length) {
            throw new Error("Cart is empty");
        }

        // =====================================================
        // 2. VALIDATE PRODUCTS & STOCK
        // =====================================================

        let subtotal = 0;

        for (const cart of carts) {

            const product: any = cart.productId;

            if (!product) {
                throw new Error("Product not found");
            }

            // Example size stock structure:
            // sizes: [{ size: 42, stock: 5 }]

            const sizeVariant = product.sizes.find(
                (s: any) => s.size === cart.selectedSize
            );

            if (!sizeVariant) {
                throw new Error(
                    `Size ${cart.selectedSize} unavailable`
                );
            }

            if (sizeVariant.stock < cart.quantity) {
                throw new Error(
                    `${product.name} out of stock`
                );
            }

            // NEVER TRUST FRONTEND PRICE
            cart.unitPrice = product.price;

            cart.totalPrice = product.price * cart.quantity;

            subtotal += cart.totalPrice;
        }

        // =====================================================
        // 3. CALCULATE TOTALS
        // =====================================================

        const shippingCharge = 100;

        const discountAmount = 0;

        const totalAmount =
            subtotal +
            shippingCharge -
            discountAmount;

        // =====================================================
        // 4. CREATE MAIN ORDER
        // =====================================================

        const order = await OrderModel.create([{
            buyerId: payload.buyerId,

            orderNumber: `ORD-${Date.now()}`,

            subtotal,
            shippingCharge,
            discountAmount,
            totalAmount,

            totalItems: carts.length,

            paymentStatus: "PENDING",

            orderStatus: "PLACED",

            paymentMethod: payload.paymentMethod,

            shippingAddress: payload.shippingAddress,

        }], { session });

        const createdOrder = order[0];

        // =====================================================
        // 5. CREATE ORDER ITEMS
        // =====================================================

        const orderItems = carts.map((cart: any) => {

            const product = cart.productId;

            return {

                orderId: createdOrder._id,

                buyerId: payload.buyerId,

                retailerId: cart.retailerId,

                productId: cart.productId._id,

                productSnapshot: {
                    name: product.name,
                    image: product.image,
                    brand: product.brand,
                },

                selectedSize: cart.selectedSize,

                quantity: cart.quantity,

                unitPrice: cart.unitPrice,

                totalPrice: cart.totalPrice,

                status: "PLACED",
            };
        });

        await OrderItemModel.insertMany(
            orderItems,
            { session }
        );

        // =====================================================
        // 6. CREATE SELLER SPLIT ORDERS
        // =====================================================

        const retailerMap = new Map();

        carts.forEach((cart: any) => {

            const retailerId =
                cart.retailerId.toString();

            if (!retailerMap.has(retailerId)) {
                retailerMap.set(retailerId, {
                    retailerId,
                    totalItems: 0,
                    totalAmount: 0,
                });
            }

            const existing =
                retailerMap.get(retailerId);

            existing.totalItems += cart.quantity;

            existing.totalAmount += cart.totalPrice;
        });

        const sellerSplitOrders = Array.from(
            retailerMap.values()
        ).map((retailer: any) => ({
            orderId: createdOrder._id,

            retailerId: retailer.retailerId,

            buyerId: payload.buyerId,

            totalItems: retailer.totalItems,

            totalAmount: retailer.totalAmount,

            status: "PLACED",
        }));

        // await SellerSplitOrderModel.insertMany(
        //     sellerSplitOrders,
        //     { session }
        // );

        // =====================================================
        // 7. CREATE PAYMENT RECORD
        // =====================================================

        const payment = await PaymentModel.create([{
            orderId: createdOrder._id,

            buyerId: payload.buyerId,

            amount: totalAmount,

            gateway: payload.paymentMethod,

            transactionId: `TXN-${Date.now()}`,

            status: payload.paymentMethod === "COD"
                ? "SUCCESS"
                : "PENDING",
        }], { session });

        // =====================================================
        // 8. FOR COD AUTO COMPLETE
        // =====================================================

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
            }
        };

    } catch (error: any) {

        await session.abortTransaction();

        throw new Error(error.message);

    } finally {

        session.endSession();
    }
};