import mongoose from "mongoose";
import { ProductInventorySubService } from "../../Product/subServices/ProductInventorySubService";
import { ENUM_ORDER_ITEM_STATUS } from "../../../../utilities/enum";

interface IStockLine {
  productId: mongoose.Types.ObjectId | string;
  selectedSize: number | string;
  quantity: number;
  status: string;
}

/** Statuses where the pair is still in reservedStock (unpaid checkout or deposit hold). */
const RESERVED_STATUSES = [ENUM_ORDER_ITEM_STATUS.PENDING_PAYMENT, ENUM_ORDER_ITEM_STATUS.HOLDING];

/**
 * Sub-Service owning the stock bookkeeping of an order item through its life:
 *   checkout/hold created  -> stock -q, reserved +q   (ProductInventorySubService.reserveSizeStock)
 *   paid (Buy Now)         -> reserved -q             (commitReservation)
 *   hold settled in store  -> reserved -q             (commitReservation)
 *   cancelled / expired    -> returnToStock (depends on whether the pair was still reserved)
 */
export class OrderInventorySubService {
  /** Payment captured: the reserved pair is now sold. */
  static async commitReservation(item: IStockLine, session: mongoose.ClientSession) {
    await ProductInventorySubService.adjustSizeStock(
      String(item.productId),
      String(item.selectedSize),
      0,
      -item.quantity,
      session
    );
  }

  /** Give the pair back to available stock. Call BEFORE changing the item's status. */
  static async returnToStock(item: IStockLine, session: mongoose.ClientSession) {
    const wasReserved = RESERVED_STATUSES.includes(item.status);
    await ProductInventorySubService.adjustSizeStock(
      String(item.productId),
      String(item.selectedSize),
      item.quantity,
      wasReserved ? -item.quantity : 0,
      session
    );
  }
}
