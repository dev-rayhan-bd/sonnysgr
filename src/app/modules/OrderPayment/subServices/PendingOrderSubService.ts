import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import { OrderItemModel, OrderModel } from "../../Order/Order.model";
import { ProductModel } from "../../Product/Product.model";
import { ProductInventorySubService } from "../../Product/subServices/ProductInventorySubService";
import { RetailerStoreSettingsSubService } from "../../Retailer/subServices/RetailerStoreSettingsSubService";
import {
  ENUM_ORDER_ITEM_STATUS,
  ENUM_ORDER_STATUS,
  ENUM_ORDER_TYPE,
  ENUM_PAYMENT_METHOD,
  ENUM_PAYMENT_STATUS,
} from "../../../../utilities/enum";
import {
  HOLD_DEPOSIT_RULES,
  ORDER_SHIPPING_CHARGE,
  roundMoney,
  STRIPE_MIN_CHARGE_USD,
} from "../OrderPayment.constant";
import {
  ICheckoutItemInput,
  IHoldDepositPayload,
  IShippingAddressInput,
} from "../OrderPayment.interface";
import { shortRef } from "../OrderPayment.utils";

const PICKUP_ADDRESS = {
  name: "In-Store Pickup",
  phone: "N/A",
  address: "Local Store Pickup & Settlement",
  city: "Local",
  lat: 0,
  lng: 0,
};

const toOrderAddress = (address?: IShippingAddressInput) =>
  address
    ? { name: address.name, phone: address.phone, address: address.address, city: "Default", lat: 0, lng: 0 }
    : PICKUP_ADDRESS;

interface IPricedLine {
  product: {
    _id: mongoose.Types.ObjectId;
    retailerId: mongoose.Types.ObjectId;
    name: string;
    brand?: string;
    images?: string[];
    price: number;
    variant?: { size: string; price?: number }[];
  };
  size: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Sub-Service that creates the unpaid order (status "Pending Payment") and reserves its stock.
 * Prices ALWAYS come from the database — client-sent prices are ignored.
 * Runs inside the caller's transaction.
 */
export class PendingOrderSubService {
  private static async priceLine(
    item: { productId: string; selectedSize: number | string; quantity: number },
    session: mongoose.ClientSession
  ): Promise<IPricedLine> {
    if (!mongoose.Types.ObjectId.isValid(item.productId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Invalid product id: ${item.productId}`);
    }
    const product = (await ProductModel.findById(item.productId)
      .select("retailerId name brand images price variant")
      .session(session)
      .lean()) as IPricedLine["product"] | null;
    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, `Product not found for ID: ${item.productId}`);
    }

    const size = String(item.selectedSize);
    const variant = product.variant?.find((v) => String(v.size) === size);
    if (!variant) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Size ${size} unavailable for product: ${product.name}`);
    }

    const unitPrice = roundMoney(Number(variant.price || product.price));
    if (!(unitPrice > 0)) {
      throw new AppError(StatusCodes.BAD_REQUEST, `${product.name} has no valid price.`);
    }

    // Atomic check-and-reserve (409 if someone else took the last pair)
    await ProductInventorySubService.reserveSizeStock(String(product._id), size, item.quantity, session);

    return { product, size, quantity: item.quantity, unitPrice };
  }

  private static snapshot(line: IPricedLine) {
    return {
      name: line.product.name,
      image: line.product.images?.[0] || "",
      brand: line.product.brand || "",
    };
  }

  /** Buy Now / cart checkout: one order, one item per line, stock reserved until paid. */
  static async createPendingBuyOrder(
    buyerId: string,
    items: ICheckoutItemInput[],
    shippingAddress: IShippingAddressInput | undefined,
    session: mongoose.ClientSession
  ) {
    const lines: IPricedLine[] = [];
    for (const item of items) {
      lines.push(await this.priceLine(item, session));
    }

    const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
    const shippingCharge = ORDER_SHIPPING_CHARGE;
    const totalAmount = roundMoney(subtotal + shippingCharge);
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const now = new Date();

    const [order] = await OrderModel.create(
      [
        {
          buyerId: buyerObjectId,
          orderNumber: `GS-${shortRef()}`,
          subtotal,
          shippingCharge,
          discountAmount: 0,
          totalAmount,
          totalItems: lines.reduce((sum, l) => sum + l.quantity, 0),
          orderStatus: ENUM_ORDER_STATUS.PENDING_PAYMENT,
          orderType: ENUM_ORDER_TYPE.BUY_NOW,
          paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
          paymentMethod: ENUM_PAYMENT_METHOD.STRIPE,
          shippingAddress: toOrderAddress(shippingAddress),
          pickupTime: now,
        },
      ],
      { session }
    );

    const orderItems = await OrderItemModel.create(
      lines.map((line) => ({
        orderId: order._id,
        buyerId: buyerObjectId,
        retailerId: line.product.retailerId,
        productId: line.product._id,
        productSnapshot: this.snapshot(line),
        selectedSize: line.size,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: roundMoney(line.unitPrice * line.quantity),
        status: ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT,
        pickupTime: now,
      })),
      { session, ordered: true }
    );

    return { order, orderItems, lines };
  }

  /** Deposit amount for a hold: server rule, optionally raised (never lowered) by the buyer. */
  static resolveDeposit(totalAmount: number, requested?: number) {
    const ruleDeposit = Math.min(
      HOLD_DEPOSIT_RULES.flatCapUsd,
      roundMoney(totalAmount * HOLD_DEPOSIT_RULES.percentOfTotal)
    );
    const minimum = Math.min(totalAmount, Math.max(ruleDeposit, STRIPE_MIN_CHARGE_USD));

    if (requested === undefined || requested === null) return roundMoney(minimum);
    if (requested < minimum || requested > totalAmount) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Deposit must be between $${minimum.toFixed(2)} and $${totalAmount.toFixed(2)}.`
      );
    }
    return roundMoney(requested);
  }

  /** Module 9.1: unpaid hold. The countdown starts only when the deposit is paid. */
  static async createPendingHold(buyerId: string, payload: IHoldDepositPayload, session: mongoose.ClientSession) {
    const quantity = payload.quantity || 1;
    const line = await this.priceLine(
      { productId: payload.productId, selectedSize: payload.selectedSize, quantity },
      session
    );

    const retailerId = String(line.product.retailerId);
    if (payload.retailerId && payload.retailerId !== retailerId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "This product does not belong to the selected store.");
    }

    const totalAmount = roundMoney(line.unitPrice * quantity);
    const deposit = this.resolveDeposit(totalAmount, payload.depositAmount);

    // Module 9.2: the store's hold duration is the default and the upper bound
    const storeSettings = await RetailerStoreSettingsSubService.getSettingsInternal(retailerId, session);
    const requestedHours = Number(payload.holdingTimeHours);
    const holdingHours =
      requestedHours > 0 ? Math.min(requestedHours, storeSettings.holdDurationHours) : storeSettings.holdDurationHours;

    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const now = new Date();
    const [order] = await OrderModel.create(
      [
        {
          buyerId: buyerObjectId,
          orderNumber: `GS-HOLD-${shortRef()}`,
          subtotal: totalAmount,
          shippingCharge: 0,
          discountAmount: 0,
          totalAmount,
          totalItems: quantity,
          orderStatus: ENUM_ORDER_STATUS.PENDING_PAYMENT,
          orderType: ENUM_ORDER_TYPE.HOLD,
          paymentStatus: ENUM_PAYMENT_STATUS.PENDING,
          paymentMethod: ENUM_PAYMENT_METHOD.STRIPE,
          holdingTime: holdingHours,
          partialPayment: deposit,
          pickupVerificationCode: `GS-HOLD-${Math.floor(100000 + Math.random() * 900000)}`,
          pickupTime: now,
          shippingAddress: PICKUP_ADDRESS,
        },
      ],
      { session }
    );

    const [orderItem] = await OrderItemModel.create(
      [
        {
          orderId: order._id,
          buyerId: buyerObjectId,
          retailerId: line.product.retailerId,
          productId: line.product._id,
          productSnapshot: this.snapshot(line),
          selectedSize: line.size,
          quantity,
          unitPrice: line.unitPrice,
          totalPrice: totalAmount,
          status: ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT,
          pickupTime: now,
        },
      ],
      { session }
    );

    return { order, orderItem, line, deposit, holdingHours };
  }
}
