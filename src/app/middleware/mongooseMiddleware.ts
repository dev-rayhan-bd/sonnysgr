import { ENUM_PRODUCT_AVAILABILITY } from "../../utilities/enum";



const LOW_STOCK_THRESHOLD = 3;

export function getAvailability(variants: { size: string; stock: number }[]) {
    const totalStock = variants.reduce(
        (sum, variant) => sum + variant.stock,
        0
    );

    if (totalStock === 0) {
        return ENUM_PRODUCT_AVAILABILITY.SOLD_OUT;
    }

    if (totalStock <= LOW_STOCK_THRESHOLD) {
        return ENUM_PRODUCT_AVAILABILITY.LOW_STOCK;
    }

    return ENUM_PRODUCT_AVAILABILITY.IN_STOCK;
}