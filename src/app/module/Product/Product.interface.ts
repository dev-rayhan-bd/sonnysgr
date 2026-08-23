import { Types } from "mongoose";

export interface IProduct {
  retailerId: Types.ObjectId;
  type: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  brand: string;
  // color?: string;
  styleCode?: string;
  variant: {
    gender: TGender,
    size: string,
    stock: number,
    price: number
  }[];
  sneakerAttributes?: {};
  tshirtAttributes?: {};
  availability: string;
  totalSearchCount: number;
  createdAt: Date;
}

export interface IProductVariant {
  retailerId: Types.ObjectId;
  productId: Types.ObjectId;
  size: string;
  color: string;
  sku: string;
  price: number;
  stock: number;
  reservedStock: number;
  isActive: boolean;
  createdAt: Date;
}

export type TProductType = "Shoes" | "Clothing";

export type TGender = "Men" | "Women" | "Kids";

export type TSneakerAttributes = {
  modelName: string;
  releaseYear?: number;
  colorway?: string;
  condition?: "NEW" | "USED" | "DEADSTOCK";
  upperMaterial?: string;
  soleMaterial?: string;
  closureType?: string;
};

export type TTshirtAttributes = {
  fit?: "REGULAR" | "SLIM" | "OVERSIZED" | "RELAXED";
  fabric?: string;
  neckType?: "CREW_NECK" | "V_NECK" | "POLO" | "ROUND_NECK";
  sleeveType?: "SHORT_SLEEVE" | "LONG_SLEEVE" | "SLEEVELESS";
  gsm?: number;
};

export type TProductVariantPayload = {
  size: string;
  color: string;
  sku: string;
  price: number;
  stock: number;
};

export type TAddProductPayload = {
  retailerId: string;
  type: TProductType;
  name: string;
  brand: string;
  description: string;
  // images: string[];
  price: number;
  availability: string;
  styleCode: string;
  sneakerAttributes?: TSneakerAttributes;
  tshirtAttributes?: TTshirtAttributes;
  variant: object[];
};

export interface IRecentSearch extends Document {
  buyerId: string;
  keyword: string;
  searchedAt: Date;
}