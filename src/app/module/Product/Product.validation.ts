import { z } from "zod";


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


const ProductValidations = { 
    addNewProductValidation
 };

export default ProductValidations;