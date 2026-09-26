/**
 * Stock Service — shared atomic stock operations.
 *
 * All functions operate inside a Prisma transaction (tx).
 * Never call these outside a $transaction block.
 *
 * Quantity Precision Policy:
 *   All quantities are processed through roundQuantity() / addQuantities() /
 *   subtractQuantities() to enforce 4-decimal precision and prevent IEEE 754 drift.
 *   Safe-range check: quantities must not exceed Number.MAX_SAFE_INTEGER / 10000.
 */

import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { roundQuantity, addQuantities, subtractQuantities } from '../utils/quantity';

const MAX_QTY = Number.MAX_SAFE_INTEGER / 10000; // ~9007 billion — prevents overflow

/**
 * Throws if qty is outside the valid range [0, MAX_QTY].
 */
export function assertSafeQuantity(qty: number, label = 'Quantity'): void {
  if (!isFinite(qty) || isNaN(qty)) {
    throw new AppError(`${label} must be a finite number`, 400);
  }
  if (qty < 0) {
    throw new AppError(`${label} cannot be negative`, 400);
  }
  if (qty > MAX_QTY) {
    throw new AppError(`${label} exceeds the safe range (max ${MAX_QTY.toFixed(4)})`, 400);
  }
}

type TX = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Gets or creates a StockBalance record for product at location.
 * Returns the current rounded quantity.
 */
export async function getOrCreateBalance(
  tx: TX,
  productId: string,
  locationId: string
): Promise<{ id: string; quantity: number }> {
  const record = await tx.stockBalance.upsert({
    where: { productId_locationId: { productId, locationId } },
    update: {},
    create: { productId, locationId, quantity: 0 },
  });
  return { id: record.id, quantity: roundQuantity(record.quantity) };
}

/**
 * Adds qty to balance. Returns new balance.
 */
export async function addStock(
  tx: TX,
  productId: string,
  locationId: string,
  qty: number
): Promise<number> {
  const { id, quantity: current } = await getOrCreateBalance(tx, productId, locationId);
  const newQty = addQuantities(current, qty);
  assertSafeQuantity(newQty, 'Resulting balance');
  await tx.stockBalance.update({ where: { id }, data: { quantity: newQty } });
  return newQty;
}

/**
 * Deducts qty from balance. Throws if insufficient stock.
 * Returns new balance.
 */
export async function deductStock(
  tx: TX,
  productId: string,
  locationId: string,
  qty: number
): Promise<number> {
  const { id, quantity: current } = await getOrCreateBalance(tx, productId, locationId);
  if (current < qty) {
    throw new AppError(
      `Insufficient stock for product at location. Available: ${current}, Requested: ${qty}`,
      400
    );
  }
  const newQty = subtractQuantities(current, qty);
  await tx.stockBalance.update({ where: { id }, data: { quantity: newQty } });
  return newQty;
}

/**
 * Writes a signed ledger entry.
 */
export async function writeLedger(
  tx: TX,
  data: {
    operationId?: string;
    productId: string;
    locationId: string;
    deltaQty: number;
    balanceAfter: number;
    referenceType: string;
    referenceDoc: string;
    actorId?: string;
    notes?: string;
  }
): Promise<void> {
  await tx.stockLedger.create({ data });
}

/**
 * Generates a unique sequential reference with collision guard.
 * Supports calling with (tx, type, prefix) or (type, prefix).
 */
export async function generateReference(
  txOrType: TX | string,
  typeOrPrefix?: string,
  maybePrefix?: string
): Promise<string> {
  let client: any = prisma;
  let type: string;
  let prefix: string;

  if (typeof txOrType === 'string') {
    type = txOrType;
    prefix = typeOrPrefix || (
      type === 'RECEIPT' ? 'WH/IN' :
      type === 'DELIVERY' ? 'WH/OUT' :
      type === 'INTERNAL_TRANSFER' ? 'WH/INT' :
      type === 'ADJUSTMENT' ? 'WH/ADJ' : 'WH/OP'
    );
  } else {
    client = txOrType;
    type = typeOrPrefix!;
    prefix = maybePrefix || (
      type === 'RECEIPT' ? 'WH/IN' :
      type === 'DELIVERY' ? 'WH/OUT' :
      type === 'INTERNAL_TRANSFER' ? 'WH/INT' :
      type === 'ADJUSTMENT' ? 'WH/ADJ' : 'WH/OP'
    );
  }

  const count = await client.operation.count({ where: { type } });
  const seq = (count + 1).toString().padStart(4, '0');
  const candidate = `${prefix}/${seq}`;
  const existing = await client.operation.findUnique({ where: { reference: candidate } });
  if (existing) {
    // Collision: append last 5 digits of epoch ms
    return `${prefix}/${seq}-${Date.now().toString().slice(-5)}`;
  }
  return candidate;
}
