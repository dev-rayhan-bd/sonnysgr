import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { OrderItemModel, OrderModel } from '../Order.model';
import { ProductModel } from '../../Product/Product.model';
import { ProductInventorySubService } from '../../Product/subServices/ProductInventorySubService';
import { ENUM_ORDER_ITEM_STATUS, ENUM_ORDER_STATUS, ENUM_ORDER_TYPE, ENUM_PAYMENT_METHOD, ENUM_PAYMENT_STATUS } from '../../../../utilities/enum';

/**
 * Sub-Service dedicated to Direct Buy Now & Cart Checkout Orchestration
 */
export class OrderCheckoutSubService {
  /**
   * Buy Now direct checkout
   */
  static async buyNowOrder(
    userDetails: IJwtPayload,
    payload: {
      retailerId: string;
      productId: string;
      selectedSize: number;
      quantity: number;
      unitPrice: number;
      shippingAddress: any;
      shippingCharge?: number;
      tax?: number;
      pickupTime?: Date;
    }
  ) {
    const { profileId } = userDetails;
    const {
      retailerId,
      productId,
      selectedSize,
      quantity = 1,
      unitPrice,
      shippingAddress,
      shippingCharge = 13.95,
      tax = 18.48,
      pickupTime = new Date(),
    } = payload;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const product = await ProductModel.findById(productId).session(session);
      if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Product not found.');
      }

      const variant = product.variant?.find((v: any) => String(v.size) === String(selectedSize));
      if (!variant || variant.stock < quantity) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Selected size variant is out of stock.');
      }

      const subtotal = unitPrice * quantity;
      const totalAmount = subtotal + shippingCharge + tax;
      const orderNumber = `GS-${Date.now().toString().slice(-6)}`;

      // 1. Create Order Record
      const [order] = await OrderModel.create(
        [
          {
            buyerId: new mongoose.Types.ObjectId(profileId),
            orderNumber,
            subtotal,
            shippingCharge,
            discountAmount: 0,
            totalAmount,
            totalItems: quantity,
            orderStatus: ENUM_ORDER_STATUS.PLACED,
            orderType: ENUM_ORDER_TYPE.BUY_NOW,
            paymentStatus: ENUM_PAYMENT_STATUS.PAID,
            shippingAddress: shippingAddress || {
              name: 'Customer',
              phone: '00000000',
              address: 'Direct Delivery Address',
              city: 'Local',
              lat: 0,
              lng: 0,
            },
            pickupTime,
          },
        ],
        { session }
      );

      // 2. Create Order Item
      const [orderItem] = await OrderItemModel.create(
        [
          {
            orderId: order._id,
            buyerId: new mongoose.Types.ObjectId(profileId),
            retailerId: new mongoose.Types.ObjectId(retailerId),
            productId: new mongoose.Types.ObjectId(productId),
            productSnapshot: {
              name: product.name,
              image: product.images[0] || '',
              brand: product.brand,
            },
            selectedSize,
            quantity,
            unitPrice,
            totalPrice: subtotal,
            status: ENUM_ORDER_ITEM_STATUS.PLACED,
            pickupTime,
          },
        ],
        { session }
      );

      // 3. Deduct stock atomically
      await ProductInventorySubService.adjustSizeStock(
        productId,
        String(selectedSize),
        -quantity,
        0,
        session
      );

      await session.commitTransaction();
      return { order, orderItem };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Multi-vendor Cart Checkout
   */
  static async cartOrder(userDetails: IJwtPayload, payload: any) {
    const { profileId } = userDetails;
    const { items, shippingAddress, shippingCharge = 10, discountAmount = 0 } = payload;

    if (!items || items.length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Cart contains no items to order.');
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let subtotal = 0;
      let totalItems = 0;

      items.forEach((item: any) => {
        subtotal += (item.unitPrice || 0) * (item.quantity || 1);
        totalItems += item.quantity || 1;
      });

      const totalAmount = subtotal + shippingCharge - discountAmount;
      const orderNumber = `GS-${Date.now().toString().slice(-6)}`;

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
            shippingAddress: shippingAddress || {
              name: 'Customer',
              phone: '00000000',
              address: 'Multi-store Delivery',
              city: 'Local',
              lat: 0,
              lng: 0,
            },
            pickupTime: new Date(),
          },
        ],
        { session }
      );

      // Create items and deduct stock
      const orderItems = [];
      for (const item of items) {
        const product = await ProductModel.findById(item.productId).session(session);
        if (!product) continue;

        const [createdItem] = await OrderItemModel.create(
          [
            {
              orderId: order._id,
              buyerId: new mongoose.Types.ObjectId(profileId),
              retailerId: new mongoose.Types.ObjectId(item.retailerId),
              productId: new mongoose.Types.ObjectId(item.productId),
              productSnapshot: {
                name: product.name,
                image: product.images[0] || '',
                brand: product.brand,
              },
              selectedSize: item.selectedSize,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              status: ENUM_ORDER_ITEM_STATUS.PLACED,
              pickupTime: new Date(),
            },
          ],
          { session }
        );

        await ProductInventorySubService.adjustSizeStock(
          item.productId,
          String(item.selectedSize),
          -item.quantity,
          0,
          session
        );

        orderItems.push(createdItem);
      }

      await session.commitTransaction();
      return { order, orderItems };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create direct pending order (required by Payment Checkout integration)
   */
  static async createDirectPendingOrderService(
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
    paymentMethod: string,
    session: mongoose.ClientSession
  ) {
    const paymentMethodMap: Record<string, string> = {
      STRIPE: ENUM_PAYMENT_METHOD.STRIPE,
      PAYPAL: ENUM_PAYMENT_METHOD.PAYPAL,
      CREDIT_CARD: ENUM_PAYMENT_METHOD.CREDIT_CARD,
    };
    const finalPaymentMethod = paymentMethodMap[paymentMethod?.toUpperCase()] || ENUM_PAYMENT_METHOD.STRIPE;

    let subtotal = 0;
    const processedItems: any[] = [];

    for (const item of orderItems) {
      const product = await ProductModel.findById(item.productId).session(session);
      if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, `Product not found for ID: ${item.productId}`);
      }

      const sizeVariant = product.variant?.find(
        (s: any) => String(s.size) === String(item.selectedSize)
      );

      if (!sizeVariant) {
        throw new AppError(StatusCodes.BAD_REQUEST, `Size ${item.selectedSize} unavailable for product: ${product.name}`);
      }

      if (sizeVariant.stock < item.quantity) {
        throw new AppError(StatusCodes.BAD_REQUEST, `${product.name} out of stock for size ${item.selectedSize}`);
      }

      const unitPrice = sizeVariant.price || product.price;
      const itemTotalPrice = unitPrice * item.quantity;
      subtotal += itemTotalPrice;

      processedItems.push({
        retailerId: product.retailerId,
        productId: product._id,
        productSnapshot: {
          name: product.name,
          image: product.images?.[0] || '',
          brand: product.brand || '',
        },
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotalPrice,
        status: ENUM_ORDER_ITEM_STATUS.PLACED,
      });
    }

    const finalShippingAddress = {
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      address: shippingAddress.address,
      city: 'Default',
      lat: 0,
      lng: 0,
    };

    const shippingCharge = 13.95;
    const discountAmount = 0;
    const totalAmount = subtotal + shippingCharge - discountAmount;
    const orderNumber = `GS-${Date.now().toString().slice(-6)}`;

    const [order] = await OrderModel.create(
      [
        {
          buyerId: new mongoose.Types.ObjectId(buyerId),
          orderNumber,
          subtotal,
          shippingCharge,
          discountAmount,
          totalAmount,
          totalItems: orderItems.length,
          orderStatus: ENUM_ORDER_STATUS.PLACED,
          orderType: ENUM_ORDER_TYPE.BUY_NOW,
          paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
          paymentMethod: finalPaymentMethod,
          shippingAddress: finalShippingAddress,
          pickupTime: new Date(),
        },
      ],
      { session }
    );

    for (const item of processedItems) {
      await OrderItemModel.create(
        [
          {
            ...item,
            orderId: order._id,
            buyerId: new mongoose.Types.ObjectId(buyerId),
            pickupTime: new Date(),
          },
        ],
        { session }
      );

      await ProductInventorySubService.adjustSizeStock(
        String(item.productId),
        String(item.selectedSize),
        -item.quantity,
        0,
        session
      );
    }

    return order;
  }
}

