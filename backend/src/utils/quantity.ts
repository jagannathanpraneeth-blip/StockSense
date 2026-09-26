import { AppError } from './errors';
export const QUANTITY_DECIMAL_PLACES = 4;
const SCALE_FACTOR = 10000;
// Conservative domain bound keeps four decimal places reliable with SQLite REAL.
export const MAX_QUANTITY = 100000000;
export function isValidQuantity(qty: unknown): boolean {
  if (typeof qty !== 'number' && typeof qty !== 'string') return false;
  if (typeof qty === 'string' && qty.trim() === '') return false;
  const n = Number(qty);
  if (!Number.isFinite(n) || n < 0 || n > MAX_QUANTITY) return false;
  const [mantissa, exponent = '0'] = n.toString().toLowerCase().split('e');
  const decimalPlaces = (mantissa.split('.')[1] || '').length - Number(exponent);
  return decimalPlaces <= 4;
}
export function assertQuantity(qty: unknown): void {
  if (!isValidQuantity(qty)) throw new AppError('Quantity must be between 0 and 100000000 with at most 4 decimal places', 422);
}
export function roundQuantity(qty: number | string | null | undefined): number {
  if (qty === null || qty === undefined) return 0;
  const n = Number(qty);
  if (!Number.isFinite(n) || Math.abs(n) > MAX_QUANTITY) throw new AppError('Quantity outside supported range', 422);
  return Math.round(n * SCALE_FACTOR) / SCALE_FACTOR;
}
export function addQuantities(a: number, b: number): number {
  return roundQuantity((Math.round(a * SCALE_FACTOR) + Math.round(b * SCALE_FACTOR)) / SCALE_FACTOR);
}
export function subtractQuantities(a: number, b: number): number {
  return roundQuantity((Math.round(a * SCALE_FACTOR) - Math.round(b * SCALE_FACTOR)) / SCALE_FACTOR);
}
