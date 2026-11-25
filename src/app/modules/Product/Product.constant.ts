/**
 * Box barcodes: UPC-A (12), EAN-13 (13), EAN-8 (8), GTIN-14, or an alphanumeric Code 128 label.
 * Stored upper-cased and trimmed so "abc-123 " and "ABC-123" are the same code.
 */
export const BARCODE_REGEX = /^[0-9A-Z-]{6,32}$/;

export const BARCODE_FORMAT_MESSAGE = "Barcode must be 6-32 characters: digits, letters or '-'.";

export const normaliseBarcode = (input: unknown): string => String(input ?? '').trim().toUpperCase();

/** Upper bound for one scan-restock call, to catch typos like 1000 instead of 10. */
export const MAX_SCAN_RESTOCK_QUANTITY = 500;
