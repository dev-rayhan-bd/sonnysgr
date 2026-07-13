import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { IJwtPayload } from "../../../interface/jwt.interface";
import deleteOldFile from "../../../utilities/deleteFile";
import { IProduct, TAddProductPayload } from "./Product.interface";
import {ProductModel, ProductVariantModel, RecentSearchModel} from "./Product.model";
import { ENUM_PRODUCT_TYPE } from "../../../utilities/enum";




const addProductService = async (
  userDetails: IJwtPayload,
  files: Express.Multer.File[],
  payload: TAddProductPayload
) => {

  const {profileId} = userDetails;

  const {
    // retailerId,
    type,
    name,
    brand,
    description,
    // images,
    price,
    styleCode,
    availability,
    sneakerAttributes,
    tshirtAttributes,
    variants,
  } = payload;

  if (!files || files.length === 0) {
        throw new ApiError(400, "At least one product image is required.");
    }

    const imageUrls = files.map(file => {
        // Assuming you have a function to upload the file and get its URL
        return `uploads/product-image/${file.filename}`; // Replace with actual URL generation logic
    });

    // console.log("product images:",imageUrls);

  

  const duplicateSkuCheck = new Set();

  // for (const variant of variants) {
  //   const sku = variant.sku.trim().toUpperCase();

  //   if (duplicateSkuCheck.has(sku)) {
  //     throw new Error(`Duplicate SKU found: ${sku}`);
  //   }

  //   duplicateSkuCheck.add(sku);
  // }

  // const duplicateVariantCheck = new Set();

  // for (const variant of variants) {
  //   const key = `${variant.size.trim().toUpperCase()}-${variant.color
  //     .trim()
  //     .toUpperCase()}`;

  //   if (duplicateVariantCheck.has(key)) {
  //     throw new Error(
  //       `Duplicate variant found for size ${variant.size} and color ${variant.color}`
  //     );
  //   }

  //   duplicateVariantCheck.add(key);
  // }

  // const existingSkus = await ProductVariant.find({
  //   sku: {
  //     $in: variants.map((variant) => variant.sku.trim().toUpperCase()),
  //   },
  // }).select("sku");

  // if (existingSkus.length > 0) {
  //   throw new Error(
  //     `SKU already exists: ${existingSkus.map((item) => item.sku).join(", ")}`
  //   );
  // }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const productPayload: Record<string, unknown> = {
      retailerId: profileId,
      type: type,
      name: name.trim(),
      brand: brand.trim(),
      description: description.trim(),
      styleCode,
      images: imageUrls || [],
      price: price,
      // gender,
      availability,
    };

    if (type === ENUM_PRODUCT_TYPE.SNEAKERS) {
      productPayload.sneakerAttributes = JSON.parse(sneakerAttributes as any);
      productPayload.tshirtAttributes = null;
    }

    if (type === ENUM_PRODUCT_TYPE.CLOTHING) {
      productPayload.tshirtAttributes = JSON.parse(tshirtAttributes as any);
      productPayload.sneakerAttributes = null;
    }

    const createdProduct = await ProductModel.create([productPayload], {
      session,
    });

    const product = createdProduct[0];

    const variantPayload = variants.map((variant) => ({
      productId: product._id,
      retailerId:profileId,
      size: variant?.size.trim(),
      color: variant?.color || "",
      sku: variant?.sku || "",
      price: variant?.price || 0,
      stock: variant?.stock,
      reservedStock: 0,
      isActive: true,
    }));

    const createdVariants = await ProductVariantModel.insertMany(variantPayload, {
      session,
    });

    await session.commitTransaction();

    return {
      product,
      variants: createdVariants,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const addProductService2 = async (
  userDetails: IJwtPayload,
  files: Express.Multer.File[],
   productData: Partial<IProduct>
  ) => {
    const {profileId} = userDetails;

    if (!files || files.length === 0) {
        throw new ApiError(400, "At least one product image is required.");
    }

    const imageUrls = files.map(file => {
        // Assuming you have a function to upload the file and get its URL
        return `uploads/product-image/${file.filename}`; // Replace with actual URL generation logic
    });

    // productData.images = imageUrls;
    
    const newProduct = new ProductModel({
      retailerId: profileId,
      images: imageUrls,
        ...productData,
    }); 

    await newProduct.save();

    if(!newProduct){
        throw new ApiError(500,"Failed to add product.");
    }

    return newProduct;
}

const editProductService = async (
    userDetails: IJwtPayload,
    productId: string,
    files: Express.Multer.File[],
    productData: Partial<IProduct>
) => {
    const {profileId} = userDetails;

    const product = await ProductModel.findOne({ _id: productId, retailerId: profileId });

    if (!product) {
        throw new ApiError(404, "Product not found or you do not have permission to edit this product.");
    }

    const existingImages = product.images || [];

    if (files && files.length > 0) {
        const imageUrls = files.map(file => {
            return `uploads/product-image/${file.filename}`;
        });
        product.images = imageUrls;
    }

    Object.assign(product, productData);

    await product.save();

    if(!product){
        throw new ApiError(500,"Failed to edit product.");
    }

    //delete old images from server if new images are uploaded
    if (files && files.length > 0 && existingImages.length > 0) {
        existingImages.forEach( (imageUrl:any) => {
            // Implement your logic to delete the image file from the server
           deleteOldFile(imageUrl);
        });
    }

    return product;
}

const deleteProductService = async (userDetails: IJwtPayload, productId: string) => {
    const {profileId} = userDetails;

    const deleted = await ProductModel.findOneAndDelete({ _id: productId, retailerId: profileId });

    if (!deleted) {
        throw new ApiError(404, "Product not found or you do not have permission to delete this product.");
    }

    return null;
}



// product-search.service.ts

const searchProductsService = async (userDetails: IJwtPayload, query: Record<string,unknown>) => {
    const {profileId} = userDetails;
    const {searchtext,type} = query;

    /*
     |--------------------------------------------------------------------------
     | 2. SEARCH PRODUCTS
     |--------------------------------------------------------------------------
     */
    let filter: Record<string, unknown> = {
      $or: [
        {
          name: {
            $regex: searchtext,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: searchtext,
            $options: "i",
          },
        },
      ],
    };

     if(type){
        filter.type = type;
     }

    const products = await ProductModel.find(filter)
      .select("_id name brand price image totalSearchCount")
      .limit(10)
      .lean();

       /*
     |--------------------------------------------------------------------------
     | 3. INCREASE totalSearchCount
     |--------------------------------------------------------------------------
     | Increment count for searched products
     */

    if (products.length > 0) {
      const productIds = products.map((product) => product._id);

      await ProductModel.updateMany(
        {
          _id: {
            $in: productIds,
          },
        },
        {
          $inc: {
            totalSearchCount: 1,
          },
        }
      );
    }

      const recent = await RecentSearchModel.findOneAndUpdate(
      {
        buyerId: profileId,
        keyword: searchtext,
      },
      {
        searchedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    

    if(!recent){
        const newRecentSearch = await RecentSearchModel.create(
            {
                buyerId: profileId,
                keyword: searchtext,
                searchedAt: new Date(),
            }
        );

        if(!newRecentSearch){
            throw new ApiError(500,"Failed to save recent search");
        }
    }


    return products;
 
};

const getTrendingNowAndRecentSearchesSevice = async (userDetails: IJwtPayload) => {
    const {profileId} = userDetails;


    const recentSearches = await RecentSearchModel.find({
      buyerId: profileId,
    })
      .sort({ searchedAt: -1 })
      .limit(10)
      .select("keyword")
      .lean();

    /*
     |--------------------------------------------------------------------------
     | 5. GET TRENDING PRODUCTS
     |--------------------------------------------------------------------------
     */

    const trendingProducts = await ProductModel.find({})
      .sort({ totalSearchCount: -1 })
      .limit(10)
      .select("_id name brand price image totalSearchCount")
      .lean();

    /*
     |--------------------------------------------------------------------------
     | 6. RETURN RESPONSE
     |--------------------------------------------------------------------------
     */

    return {
      recentSearches,
      trendingProducts,
    };
 
};



const getProductDetailsByIdService = async (productId: string) => {

    const product = await ProductModel.findById(productId);

    if(!product){
        throw new ApiError(500,"Failed to get details of the product");
    }

    product.totalSearchCount += 1;

    await product.save();

    return product;
}

const deleteRecentSearchService = async (userDetails: IJwtPayload, recentSearchId: string) => {

    const {profileId} = userDetails;

    const deleted = await RecentSearchModel.findOneAndDelete({
        _id: recentSearchId,
        buyerId: profileId,
    });

    if(!deleted){
        throw new ApiError(500,"Failed to delete recent search");
    }

    return null;
}

const ProductServices = { 
    addProductService,
    editProductService,
    deleteProductService,
    searchProductsService,
    getTrendingNowAndRecentSearchesSevice,
    getProductDetailsByIdService,
    deleteRecentSearchService
 };

export default ProductServices;