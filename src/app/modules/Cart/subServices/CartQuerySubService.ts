import mongoose from "mongoose";
import { ENUM_CART_STATUS, ENUM_PRODUCT_AVAILABILITY } from "../../../../utilities/enum";
import CartModel from "../Cart.model";

/**
 * Sub-Service dedicated to Cart Queries & Live Stock Verification
 * Strictly uses native MongoDB Aggregation Pipelines (Zero Mongoose .populate())
 */
export class CartQuerySubService {
  /**
   * Get active cart items with real-time stock verification & multi-store grouping
   */
  static async getMyCart(buyerId: string) {
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);

    const cartItems = await CartModel.aggregate([
      {
        $match: {
          buyerId: buyerObjectId,
          status: ENUM_CART_STATUS.ACTIVE,
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                brand: 1,
                price: 1,
                images: 1,
                availability: 1,
                variant: 1,
                styleCode: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "retailers",
          localField: "retailerId",
          foreignField: "_id",
          as: "retailer",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                address: 1,
                image: 1,
                averageRating: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$retailer", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ]);

    // Live Stock and Variant Validation Loop
    let subtotal = 0;
    let totalItems = 0;
    let hasOutOfStockItems = false;

    const formattedCartItems = cartItems.map((item: any) => {
      const product = item.product;
      const sizeStr = String(item.selectedSize);

      let currentVariantStock = 0;
      let isAvailable = false;

      if (product && product.variant && Array.isArray(product.variant)) {
        const matchingVariant = product.variant.find((v: any) => String(v.size) === sizeStr);
        if (matchingVariant) {
          currentVariantStock = matchingVariant.stock || 0;
          isAvailable =
            product.availability === ENUM_PRODUCT_AVAILABILITY.ACTIVE &&
            currentVariantStock >= item.quantity;
        }
      }

      if (!isAvailable) {
        hasOutOfStockItems = true;
      }

      subtotal += item.totalPrice;
      totalItems += item.quantity;

      return {
        _id: item._id,
        productId: item.productId,
        productName: product?.name || "Product Unavailable",
        brand: product?.brand || "",
        image: product?.images?.[0] || "",
        selectedSize: item.selectedSize,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        availableStock: currentVariantStock,
        isAvailable,
        retailer: {
          _id: item.retailerId,
          name: item.retailer?.name || "Local Boutique",
          address: item.retailer?.address || "",
          image: item.retailer?.image || "",
          averageRating: item.retailer?.averageRating || 5.0,
        },
        createdAt: item.createdAt,
      };
    });

    // Group items by store for hyper-local multi-store checkout
    const storeGroupsMap = new Map<string, any>();
    formattedCartItems.forEach((item: any) => {
      const storeId = item.retailer._id.toString();
      if (!storeGroupsMap.has(storeId)) {
        storeGroupsMap.set(storeId, {
          retailer: item.retailer,
          items: [],
          storeSubtotal: 0,
        });
      }
      const group = storeGroupsMap.get(storeId);
      group.items.push(item);
      group.storeSubtotal += item.totalPrice;
    });

    const storeGroups = Array.from(storeGroupsMap.values());

    return {
      cartItems: formattedCartItems,
      storeGroups,
      summary: {
        subtotal,
        totalItems,
        storeCount: storeGroups.length,
        hasOutOfStockItems,
      },
    };
  }
}
