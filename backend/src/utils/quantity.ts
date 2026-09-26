/**
 * Quantity and Precision Utility
 * 
 * StockSense Precision Policy:
 * - All physical stock quantities, transfer amounts, and demand lines support up to 4 decimal places (e.g. 0.0001 kg).
 * - Fixed-point / decimal arithmetic helpers are used to prevent IEEE 754 floating-point drift.
 * - Standard rounding algorithm uses Number.EPSILON to ensure robust half-up rounding.
 */

export const QUANTITY_DECIMAL_PLACES = 4;
const SCALE_FACTOR = Math.pow(10, QUANTITY_DECIMAL_PLACES); // 10000

/**
 * Rounds a quantity to 4 decimal places without floating-point drift.
 */
export function roundQuantity(qty: number | string | null | undefined): number {
  if (qty === null || qty === undefined) return 0;
  const num = typeof qty === 'string' ? parseFloat(qty) : qty;
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * SCALE_FACTOR) / SCALE_FACTOR;
}

/**
 * Adds two quantities safely.
 */
export function addQuantities(a: number, b: number): number {
  const scaledA = Math.round(a * SCALE_FACTOR);
  const scaledB = Math.round(b * SCALE_FACTOR);
  return (scaledA + scaledB) / SCALE_FACTOR;
}

/**
 * Subtracts b from a safely.
 */
export function subtractQuantities(a: number, b: number): number {
  const scaledA = Math.round(a * SCALE_FACTOR);
  const scaledB = Math.round(b * SCALE_FACTOR);
  return (scaledA - scaledB) / SCALE_FACTOR;
}

/**
 * Validates if quantity is a non-negative valid number.
 */
export function isValidQuantity(qty: unknown): boolean {
  if (typeof qty !== 'number' && typeof qty !== 'string') return false;
  const num = typeof qty === 'string' ? parseFloat(qty) : qty;
  return !isNaN(num) && isFinite(num) && num >= 0;
}
