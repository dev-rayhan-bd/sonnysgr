import { z } from "zod";
import { BARCODE_FORMAT_MESSAGE, BARCODE_REGEX, MAX_SCAN_RESTOCK_QUANTITY } from "./Product.constant";

// Trimmed + upper-cased before the format check, matching how the service stores it
const barcodeField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  z.string().regex(BARCODE_REGEX, BARCODE_FORMAT_MESSAGE)
);
const objectIdField = (label: string) => z.string().regex(/^[0-9a-fA-F]{24}$/, `${label} must be a valid id`);


const SneakerAttributesSchema = z.object({
//   modelName: z.string().min(1),
//   releaseYear: z.number().int().positive(),
  colorway: z.string().min(1),
  condition: z.string().min(1),
//   upperMaterial: z.string().min(1),
//   soleMaterial: z.string().min(1),
//   closureType: z.string().min(1),
});

const TshirtAttributesSchema = z.object({
  fit: z.string().min(1),
  material: z.string().min(1), 
  care: z.string().min(1),
  season: z.string().min(1),
//   gsm: z.number().positive(),
});

const ProductVariantSchema = z.object({
  size: z.string().min(1),
  color: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: barcodeField.optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(1),
});

export const addNewProductValidation = z.object({
  body: z.object({

    type: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().min(1),
    description: z.string().min(1),

    // images: z.array(z.string()).min(1),

    price: z.number().positive(),

    gender: z.string().min(1).optional(),

    sneakerAttributes: SneakerAttributesSchema.optional(),

    tshirtAttributes: TshirtAttributesSchema.optional(),

    variants: z.array(ProductVariantSchema).min(1),
  })
  
  .superRefine((data, ctx) => {
    const hasSneaker = !!data.sneakerAttributes;
    const hasTshirt = !!data.tshirtAttributes;

    if (!hasSneaker && !hasTshirt) {
      ctx.addIssue({
        code: "custom",
        message:
          "Either sneakerAttributes or tshirtAttributes is required",
        path: ["sneakerAttributes"],
      });
    }

    if (hasSneaker && hasTshirt) {
      ctx.addIssue({
        code: "custom",
        message:
          "Only one of sneakerAttributes or tshirtAttributes can be provided",
        path: ["sneakerAttributes"],
      });
    }
  })
});


// GET /product/lookup-barcode/:barcode
const lookupBarcodeValidation = z.object({
  params: z.object({ barcode: barcodeField }),
});

// POST /product/scan-restock
const scanRestockValidation = z.object({
  body: z
    .object({
      barcode: barcodeField,
      quantity: z.coerce.number().int().min(1).max(MAX_SCAN_RESTOCK_QUANTITY).optional(),
    })
    .strict(),
});

// PATCH /product/assign-barcode
const assignBarcodeValidation = z.object({
  body: z
    .object({
      productId: objectIdField("productId"),
      size: z.coerce.string().trim().min(1),
      barcode: barcodeField,
    })
    .strict(),
});

const ProductValidations = { 
    addNewProductValidation,
    lookupBarcodeValidation,
    scanRestockValidation,
    assignBarcodeValidation,
 };

export default ProductValidations;