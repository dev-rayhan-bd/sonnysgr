import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { ProductModel, ProductVariantModel } from '../Product.model';
import { ENUM_PRODUCT_AVAILABILITY } from '../../../../utilities/enum';

/**
 * Sub-Service dedicated to Size Variant Stock Modification and Availability Toggles
 */
export class ProductInventorySubService {
  /**
   * Atomically adjust stock or reservedStock for a specific product size
   */
  static async adjustSizeStock(
    productId: string,
    size: string,
    quantityChange: number,
    reserveChange: number = 0,
    session?: mongoose.ClientSession
  ) {
    const product = await ProductModel.findOneAndUpdate(
      {
        _id: productId,
        'variant.size': size,
      },
      {
        $inc: {
          'variant.$.stock': quantityChange,
          'variant.$.reservedStock': reserveChange,
        },
      },
      { new: true, session }
    );

    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, `Product size ${size} not found to adjust stock.`);
    }

    // Also sync the separate variant model
    await ProductVariantModel.findOneAndUpdate(
      { productId, size },
      {
        $inc: {
          stock: quantityChange,
          reservedStock: reserveChange,
        },
      },
      { session }
    );

    return product;
  }

  /**
   * Toggle product availability status (Active vs Coming Soon)
   */
  static async toggleAvailability(
    userDetails: IJwtPayload,
    productId: string,
    availability: string
  ) {
    const { profileId } = userDetails;

    const product = await ProductModel.findOneAndUpdate(
      { _id: productId, retailerId: profileId },
      { $set: { availability } },
      { new: true }
    );

    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Product not found or unauthorized.');
    }

    return product;
  }
}

