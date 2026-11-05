import mongoose from "mongoose";
import { WishListModel } from "../../../Engagement/Engagement.model";
import { ProductModel } from "../../../Product/Product.model";
import { NotificationModel } from "../../../Notification/Notification.model";

/**
 * Sub-Service dedicated to Automated Push Alerts (Module 11.3)
 * Restock alerts in user's saved size and Price drop alerts on favorited items
 */
export class WishlistAlertSubService {
  /**
   * Trigger Restock Push Alerts when inventory is added for a specific size (Module 11.3)
   */
  static async triggerRestockAlerts(productId: string, size: string, storeName: string) {
    if (!mongoose.Types.ObjectId.isValid(productId)) return;

    const product = (await ProductModel.findById(productId).select("name images").lean()) as any;
    if (!product) return;

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const sizeStr = String(size);

    // Find wishlisters who want this size and have restock notifications enabled
    const wishlisters = await WishListModel.find({
      productId: productObjectId,
      desiredSize: { $in: [sizeStr, Number(sizeStr)] },
      notifyOnRestock: true,
    })
      .select("buyerId")
      .lean();

    if (!wishlisters.length) return;

    const notifications = wishlisters.map((w: any) => ({
      toId: w.buyerId,
      toModel: "Buyer",
      title: "🔥 Restock Alert in Your Size!",
      description: `${product.name} in size ${sizeStr} is back in stock at ${storeName}. Grab your pair before it sells out!`,
      type: "RESTOCK_ALERT",
      referenceId: productObjectId,
      referenceModel: "Product",
      metaData: {
        productId,
        size: sizeStr,
        image: product.images?.[0] || "",
        storeName,
      },
      isSeen: false,
    }));

    await NotificationModel.insertMany(notifications);
  }

  /**
   * Trigger Price Drop Push Alerts when a retailer reduces price (Module 11.3)
   */
  static async triggerPriceDropAlerts(productId: string, oldPrice: number, newPrice: number) {
    if (newPrice >= oldPrice || !mongoose.Types.ObjectId.isValid(productId)) return;

    const product = (await ProductModel.findById(productId).select("name images").lean()) as any;
    if (!product) return;

    const productObjectId = new mongoose.Types.ObjectId(productId);

    // Find wishlisters with price drop alert enabled
    const wishlisters = await WishListModel.find({
      productId: productObjectId,
      notifyOnPriceDrop: true,
      $or: [{ targetPrice: { $exists: false } }, { targetPrice: null }, { targetPrice: { $gte: newPrice } }],
    })
      .select("buyerId")
      .lean();

    if (!wishlisters.length) return;

    const dropAmount = oldPrice - newPrice;

    const notifications = wishlisters.map((w: any) => ({
      toId: w.buyerId,
      toModel: "Buyer",
      title: "🏷️ Price Drop Alert!",
      description: `Great news! ${product.name} dropped by $${dropAmount} (Now $${newPrice}, was $${oldPrice}).`,
      type: "PRICE_DROP",
      referenceId: productObjectId,
      referenceModel: "Product",
      metaData: {
        productId,
        oldPrice,
        newPrice,
        image: product.images?.[0] || "",
      },
      isSeen: false,
    }));

    await NotificationModel.insertMany(notifications);
  }
}
