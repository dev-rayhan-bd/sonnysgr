import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../../../../interface/jwt.interface';
import { IProduct, TAddProductPayload } from '../Product.interface';
import { ProductModel, ProductVariantModel } from '../Product.model';
import AuthModel from '../../auth/auth.model';
import { uploadMultipleToCloud, deleteFromCloud } from '../../../../helper/cloudStorage';
import { ENUM_PRODUCT_AVAILABILITY, ENUM_PRODUCT_TYPE } from '../../../../utilities/enum';

/**
 * Sub-Service dedicated to Product Creation, Updating, and Deletion
 */
export class ProductCommandSubService {
  /**
   * Add new product with multi-size variants and images uploaded to Cloudinary / AWS S3
   */
  static async addProduct(
    userDetails: IJwtPayload,
    files: Express.Multer.File[],
    payload: any
  ): Promise<IProduct> {
    const { profileId, authId } = userDetails;

    // Verify retailer is active
    const auth = await AuthModel.findById(authId);
    if (!auth || auth.status !== 'Active') {
      throw new AppError(StatusCodes.FORBIDDEN, `${auth?.status || 'Inactive'} user cannot add products.`);
    }

    if (!files || files.length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'At least one product image is required.');
    }

    // Upload product images to Cloudinary (or S3 if configured)
    const uploadResults = await uploadMultipleToCloud(files, 'products');
    const imageUrls = uploadResults.map((img) => img.url);

    // Parse variants if sent as stringified JSON in form-data
    let parsedVariants: any[] = [];
    if (payload.variant) {
      parsedVariants = typeof payload.variant === 'string' ? JSON.parse(payload.variant) : payload.variant;
    } else if (payload.variants) {
      parsedVariants = typeof payload.variants === 'string' ? JSON.parse(payload.variants) : payload.variants;
    }

    // Standardize variant structure
    const formattedVariants = parsedVariants.map((v) => ({
      gender: v.gender || payload.gender || 'Men',
      size: String(v.size),
      stock: Number(v.stock) || 0,
      price: Number(v.price) || Number(payload.price) || 0,
      reservedStock: 0,
    }));

    // Calculate base price from variants if not specified
    let basePrice = Number(payload.price);
    if ((!basePrice || basePrice <= 0) && formattedVariants.length > 0) {
      basePrice = Math.min(...formattedVariants.map((v) => v.price));
    }

    // Availability parsing matching UI (Active vs Coming Soon)
    let availability = payload.availability || ENUM_PRODUCT_AVAILABILITY.ACTIVE;
    if (payload.availability === 'Coming Soon') {
      availability = ENUM_PRODUCT_AVAILABILITY.COMING_SOON;
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const productDoc: any = {
        retailerId: new mongoose.Types.ObjectId(profileId),
        type: payload.type || ENUM_PRODUCT_TYPE.SHOES,
        name: payload.name,
        brand: payload.brand,
        description: payload.description || '',
        price: basePrice,
        images: imageUrls,
        styleCode: payload.styleCode || payload.sku || '',
        availability,
        variant: formattedVariants,
        sneakerAttributes: {
          colorway: payload.colorway || payload.sneakerAttributes?.colorway || '',
          condition: payload.condition || payload.sneakerAttributes?.condition || 'New',
        },
      };

      const [createdProduct] = await ProductModel.create([productDoc], { session });

      // Sync individual variant records for fast SKU lookups
      if (formattedVariants.length > 0) {
        const variantDocs = formattedVariants.map((v) => ({
          productId: createdProduct._id,
          retailerId: new mongoose.Types.ObjectId(profileId),
          size: v.size,
          price: v.price,
          stock: v.stock,
          reservedStock: 0,
          sku: payload.styleCode || '',
          isActive: availability === ENUM_PRODUCT_AVAILABILITY.ACTIVE,
        }));
        await ProductVariantModel.insertMany(variantDocs, { session });
      }

      await session.commitTransaction();
      return createdProduct;
    } catch (error) {
      await session.abortTransaction();
      // Rollback uploaded images from cloud on database failure
      await Promise.all(uploadResults.map((img) => deleteFromCloud(img.key).catch(() => {})));
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Edit existing product and update images in Cloud Storage
   */
  static async editProduct(
    userDetails: IJwtPayload,
    productId: string,
    files: Express.Multer.File[] | undefined,
    payload: any
  ): Promise<IProduct> {
    const { profileId } = userDetails;

    const product = await ProductModel.findOne({
      _id: productId,
      retailerId: profileId,
    });

    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Product not found or unauthorized.');
    }

    const updateData: any = {};
    if (payload.name) updateData.name = payload.name;
    if (payload.brand) updateData.brand = payload.brand;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.price) updateData.price = Number(payload.price);
    if (payload.styleCode) updateData.styleCode = payload.styleCode;
    if (payload.availability) updateData.availability = payload.availability;

    // Handle new images upload
    if (files && files.length > 0) {
      const uploadResults = await uploadMultipleToCloud(files, 'products');
      const newUrls = uploadResults.map((img) => img.url);
      updateData.images = newUrls;

      // Delete old images from cloud
      if (product.images && product.images.length > 0) {
        product.images.forEach((oldUrl: string) => deleteFromCloud(oldUrl).catch(() => {}));
      }
    }

    // Handle variants update
    if (payload.variant || payload.variants) {
      const raw = payload.variant || payload.variants;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      updateData.variant = parsed.map((v: any) => ({
        gender: v.gender || 'Men',
        size: String(v.size),
        stock: Number(v.stock) || 0,
        price: Number(v.price) || updateData.price || product.price,
        reservedStock: v.reservedStock || 0,
      }));
    }

    if (payload.colorway) {
      updateData['sneakerAttributes.colorway'] = payload.colorway;
    }

    const updated = await ProductModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update product.');
    }

    return updated;
  }

  /**
   * Delete product and clean up its cloud assets
   */
  static async deleteProduct(
    userDetails: IJwtPayload,
    productId: string
  ): Promise<null> {
    const { profileId } = userDetails;

    const product = await ProductModel.findOneAndDelete({
      _id: productId,
      retailerId: profileId,
    });

    if (!product) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Product not found or unauthorized.');
    }

    // Clean up images from cloud
    if (product.images && product.images.length > 0) {
      product.images.forEach((img: string) => deleteFromCloud(img).catch(() => {}));
    }

    // Remove child variants
    await ProductVariantModel.deleteMany({ productId });

    return null;
  }
}
