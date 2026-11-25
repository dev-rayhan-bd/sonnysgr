import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { ProductModel, ProductVariantModel } from '../Product.model';
import RetailerModel from '../../Retailer/Retailer.model';
import { WishlistAlertSubService } from '../../Buyer/wishlist/subServices/WishlistAlertSubService';
import { BARCODE_FORMAT_MESSAGE, BARCODE_REGEX, normaliseBarcode } from '../Product.constant';

type TVariant = {
  _id: mongoose.Types.ObjectId;
  gender: string;
  size: string;
  stock: number;
  price: number;
  reservedStock?: number;
  barcode?: string | null;
};

type TScannedProduct = {
  _id: mongoose.Types.ObjectId;
  name: string;
  brand: string;
  images: string[];
  price: number;
  styleCode?: string;
  availability: string;
  variant: TVariant[];
};

const PRODUCT_SUMMARY_FIELDS = '_id name brand images price styleCode availability variant';

/** Shape returned to the scanner screen: the product plus the one size the barcode belongs to. */
const toScanResult = (product: TScannedProduct, barcode: string) => {
  const variant = product.variant.find((v) => v.barcode === barcode)!;
  return {
    product: {
      _id: product._id,
      name: product.name,
      brand: product.brand,
      image: product.images?.[0] || null,
      price: product.price,
      styleCode: product.styleCode || '',
      availability: product.availability,
    },
    variant: {
      _id: variant._id,
      gender: variant.gender,
      size: variant.size,
      price: variant.price,
      stock: variant.stock,
      reservedStock: variant.reservedStock || 0,
      availableStock: Math.max(0, variant.stock - (variant.reservedStock || 0)),
      barcode: variant.barcode,
    },
  };
};

/**
 * Sub-Service for the retailer's in-store barcode scanner (REQUIREMENTS 7.4):
 * scan a box → known size gets restocked, unknown code opens the add-product form pre-filled.
 */
export class ProductBarcodeSubService {
  /**
   * Validate and de-duplicate the barcodes of an incoming variant list, and make sure none is
   * already used by another product of the same store. Returns the normalised barcode per variant.
   */
  static async assertBarcodesAvailable(
    retailerId: string,
    rawBarcodes: unknown[],
    excludeProductId?: string
  ): Promise<(string | null)[]> {
    const codes = rawBarcodes.map((b) => (b === undefined || b === null || b === '' ? null : normaliseBarcode(b)));
    const present = codes.filter((c): c is string => !!c);

    const invalid = present.find((c) => !BARCODE_REGEX.test(c));
    if (invalid) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Invalid barcode "${invalid}". ${BARCODE_FORMAT_MESSAGE}`);
    }

    const duplicate = present.find((c, i) => present.indexOf(c) !== i);
    if (duplicate) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Barcode ${duplicate} is used for more than one size.`);
    }

    if (present.length) {
      const clash = await ProductModel.findOne({
        retailerId: new mongoose.Types.ObjectId(retailerId),
        'variant.barcode': { $in: present },
        ...(excludeProductId ? { _id: { $ne: new mongoose.Types.ObjectId(excludeProductId) } } : {}),
      })
        .select('name variant.barcode')
        .lean<{ name: string; variant: { barcode?: string | null }[] }>();

      if (clash) {
        const code = clash.variant.map((v) => v.barcode).find((b) => b && present.includes(b));
        throw new AppError(StatusCodes.CONFLICT, `Barcode ${code} is already assigned to "${clash.name}" in your store.`);
      }
    }

    return codes;
  }

  /** Scan → "do I already stock this?" Always 200: `found: false` tells the app to open the add form. */
  static async lookupBarcode(userDetails: IJwtPayload, rawBarcode: string) {
    const barcode = normaliseBarcode(rawBarcode);
    const product = await ProductModel.findOne({
      retailerId: new mongoose.Types.ObjectId(userDetails.profileId),
      'variant.barcode': barcode,
    })
      .select(PRODUCT_SUMMARY_FIELDS)
      .lean<TScannedProduct>();

    if (!product) return { found: false, barcode, product: null, variant: null };
    return { found: true, barcode, ...toScanResult(product, barcode) };
  }

  /** Scan → add N pairs to the size that owns this barcode, and alert wishlisters if it was sold out. */
  static async scanRestock(userDetails: IJwtPayload, payload: { barcode: string; quantity?: number }) {
    const barcode = normaliseBarcode(payload.barcode);
    const quantity = Number(payload.quantity ?? 1);
    const retailerId = new mongoose.Types.ObjectId(userDetails.profileId);

    const product = await ProductModel.findOneAndUpdate(
      { retailerId, 'variant.barcode': barcode },
      { $inc: { 'variant.$.stock': quantity } },
      { new: true, projection: PRODUCT_SUMMARY_FIELDS }
    ).lean<TScannedProduct>();

    if (!product) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        'This barcode is not in your inventory. Add it as a new product or assign it to an existing size.'
      );
    }

    const result = toScanResult(product, barcode);

    // Keep the per-size mirror collection in step with the embedded variant
    await ProductVariantModel.updateOne(
      { productId: product._id, size: result.variant.size },
      { $inc: { stock: quantity }, $set: { barcode } }
    );

    const wasSoldOut = result.variant.stock - quantity - result.variant.reservedStock <= 0;
    if (wasSoldOut) {
      const store = await RetailerModel.findById(retailerId).select('name').lean<{ name?: string }>();
      WishlistAlertSubService.triggerRestockAlerts(String(product._id), result.variant.size, store?.name || 'a nearby store')
        .catch((err) => console.error('[scanRestock] restock alert failed:', err?.message || err));
    }

    return { ...result, addedQuantity: quantity, restockAlertSent: wasSoldOut };
  }

  /** Link a scanned barcode to a size of a product the store already lists (products added before scanning). */
  static async assignBarcode(
    userDetails: IJwtPayload,
    payload: { productId: string; size: string; barcode: string }
  ) {
    const { profileId } = userDetails;
    const barcode = normaliseBarcode(payload.barcode);
    const size = String(payload.size).trim();

    const product = await ProductModel.findOne({ _id: payload.productId, retailerId: profileId })
      .select('_id variant.size variant.barcode')
      .lean<{ _id: mongoose.Types.ObjectId; variant: { size: string; barcode?: string | null }[] }>();
    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Product not found or unauthorized.');
    }
    if (!product.variant.some((v) => String(v.size) === size)) {
      throw new AppError(StatusCodes.NOT_FOUND, `Size ${size} does not exist on this product. Add the size first.`);
    }

    await this.assertBarcodesAvailable(profileId, [barcode], payload.productId);

    const sameProductOtherSize = product.variant.find((v) => v.barcode === barcode && String(v.size) !== size);
    if (sameProductOtherSize) {
      throw new AppError(StatusCodes.CONFLICT, `Barcode ${barcode} is already assigned to size ${sameProductOtherSize.size}.`);
    }

    const updated = await ProductModel.findOneAndUpdate(
      { _id: product._id, 'variant.size': size },
      { $set: { 'variant.$.barcode': barcode } },
      { new: true, projection: PRODUCT_SUMMARY_FIELDS }
    ).lean<TScannedProduct>();

    await ProductVariantModel.updateOne({ productId: product._id, size }, { $set: { barcode } });

    return toScanResult(updated!, barcode);
  }
}
