import { checkOperationInput } from '../services/operation-input';
import { claimOperation } from '../services/stock.service';
import { assertQuantity } from '../utils/quantity';
/**
 * Adjustment Controller — WH/ADJ operations.
 *
 * Workflow:
 *   1. Staff creates a draft adjustment: select product + location.
 *      Backend records the current balance as balanceSnapshot on the line.
 *   2. Staff enters counted quantity and required reason (stored in operation notes).
 *   3. Manager/Admin validates:
 *      - Compares live balance to balanceSnapshot — rejects if changed (stale count)
 *      - Computes delta = countedQty - currentBalance
 *      - If delta = 0, marks DONE with no ledger entry (no-change count)
 *      - Otherwise: applies delta atomically and writes signed ledger entry
 *
 * Stale count detection:
 *   balanceSnapshot stored on OperationLine when creating the adjustment.
 *   On validate, if live balance != balanceSnapshot → reject with recount request.
 *
 * Requires INVENTORY_MANAGER or ADMIN to validate (per permission matrix).
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { roundQuantity, addQuantities, subtractQuantities } from '../utils/quantity';
import {
  generateReference,
  getOrCreateBalance,
  writeLedger,
  assertSafeQuantity,
} from '../services/stock.service';

// ─── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required'),
  locationId: z.string().trim().min(1, 'Location is required'),
  countedQty: z.number().min(0, 'Counted quantity cannot be negative'),
  // reason is stored in notes on the operation
  reason: z.string().trim().min(3, 'A reason of at least 3 characters is required'),
});

const validateSchema = z.object({
  version: z.number().int().min(0),
});

// ─── Include helper ─────────────────────────────────────────────────────────

const ADJUSTMENT_INCLUDE = {
  destLocation: {
    select: { id: true, name: true, code: true, warehouse: { select: { id: true, name: true, code: true } } },
  },
  createdBy: { select: { id: true, name: true, email: true } },
  lines: {
    include: { product: { select: { id: true, name: true, sku: true, uom: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

// ─── Controllers ────────────────────────────────────────────────────────────

export const listAdjustments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;
    const where: any = { type: 'ADJUSTMENT' };
    if (status && typeof status === 'string' && status !== 'ALL') where.status = status.toUpperCase();
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [{ reference: { contains: q } }, { notes: { contains: q } }];
    }
    const adjustments = await prisma.operation.findMany({ where, orderBy: { createdAt: 'desc' }, include: ADJUSTMENT_INCLUDE });
    res.json({ success: true, data: adjustments });
  } catch (e) { next(e); }
};

export const getAdjustment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const a = await prisma.operation.findUnique({ where: { id: req.params.id }, include: ADJUSTMENT_INCLUDE });
    if (!a || a.type !== 'ADJUSTMENT') throw new NotFoundError('Adjustment not found');
    res.json({ success: true, data: a });
  } catch (e) { next(e); }
};

/**
 * Create adjustment draft.
 * Records current balance as balanceSnapshot so stale counts can be detected on validate.
 * demandQty = current balance (system view); doneQty = countedQty (physical count).
 * destLocationId used to hold the location (repurposed field for single-location adjustments).
 */
export const createAdjustment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    checkQuantities(req.body);
    await checkOperationInput(req.body);
    assertSafeQuantity(data.countedQty, 'Counted quantity');

    const [product, location] = await Promise.all([
      prisma.product.findUnique({ where: { id: data.productId } }),
      prisma.location.findUnique({ where: { id: data.locationId } }),
    ]);
    if (!product) throw new NotFoundError('Product not found');
    if (!location) throw new NotFoundError('Location not found');

    const result = await prisma.$transaction(async (tx) => {
      // Record current balance as snapshot
      const { quantity: currentBalance, version: balanceVersion } = await getOrCreateBalance(tx, data.productId, data.locationId);

      const reference = await generateReference(tx, 'ADJUSTMENT', 'WH/ADJ');
      const op = await tx.operation.create({
        data: {
          reference,
          type: 'ADJUSTMENT',
          status: 'DRAFT',
          destLocationId: data.locationId, // store location in destLocationId for adjustments
          notes: data.reason,
          createdById: req.user.id,
        },
      });

      await tx.operationLine.create({
        data: {
          operationId: op.id,
          productId: data.productId,
          demandQty: roundQuantity(currentBalance),  // system recorded qty
          doneQty: roundQuantity(data.countedQty),   // physical counted qty
          destLocationId: data.locationId,
          balanceVersionSnapshot: balanceVersion,
          balanceSnapshot: roundQuantity(currentBalance), // stale-count sentinel
        },
      });

      return tx.operation.findUnique({ where: { id: op.id }, include: ADJUSTMENT_INCLUDE });
    });

    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

/**
 * Validate adjustment: DRAFT → DONE
 * Requires INVENTORY_MANAGER or ADMIN (enforced in route).
 *
 * Stale count: reject if live balance != balanceSnapshot.
 * Zero delta: mark DONE, no ledger entry.
 * Non-zero delta: apply atomically, write signed ledger entry.
 */
export const validateAdjustment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { version } = validateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.operation.findUnique({ where: { id }, include: { lines: true } });
      if (!adjustment || adjustment.type !== 'ADJUSTMENT') throw new NotFoundError('Adjustment not found');
      await claimOperation(tx, id, adjustment.type, adjustment.status, version);
      await checkOperationInput(adjustment, tx);
      if (adjustment.status === 'DONE') throw new AppError('Adjustment is already validated', 400);
      if (adjustment.status !== 'DRAFT') throw new AppError('Only DRAFT adjustments can be validated', 400);
      if (adjustment.version !== version) throw new ConflictError('Adjustment was modified concurrently. Refresh and retry.');
      if (adjustment.lines.length === 0) throw new AppError('Cannot validate an empty adjustment', 400);
      if (!adjustment.destLocationId) throw new AppError('Location is required', 400);

      const line = adjustment.lines[0]; // Adjustments have exactly one line
      const countedQty = roundQuantity(line.doneQty);
      const snapshot = line.balanceSnapshot !== null ? roundQuantity(line.balanceSnapshot!) : null;

      // Stale count check: compare live balance to stored snapshot
      const { quantity: liveBalance, version: liveVersion } = await getOrCreateBalance(tx, line.productId, adjustment.destLocationId);

      if (line.balanceVersionSnapshot === null || line.balanceVersionSnapshot !== liveVersion || (snapshot !== null && liveBalance !== snapshot)) {
        throw new ConflictError(
          `The stock balance for this product has changed since you started counting. ` +
          `Snapshot: ${snapshot}, Current: ${liveBalance}. Please recount and create a new adjustment.`
        );
      }

      const delta = roundQuantity(countedQty - liveBalance);

      if (delta === 0) {
        // No-change count: mark DONE, no ledger entry invented
        return tx.operation.update({
          where: { id: adjustment.id },
          data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
          include: ADJUSTMENT_INCLUDE,
        });
      }

      // Apply delta
      const newBalance = roundQuantity(addQuantities(liveBalance, delta));
      assertSafeQuantity(newBalance, 'Resulting balance after adjustment');

      // Update balance directly (delta can be negative)
      const balanceRecord = await tx.stockBalance.upsert({
        where: { productId_locationId: { productId: line.productId, locationId: adjustment.destLocationId } },
        update: {},
        create: { productId: line.productId, locationId: adjustment.destLocationId, quantity: 0 },
      });
      await tx.stockBalance.update({
        where: { id: balanceRecord.id, version: liveVersion },
        data: { quantity: newBalance, version: { increment: 1 } },
      });

      // Signed ledger entry
      await writeLedger(tx, {
        operationId: adjustment.id,
        productId: line.productId,
        locationId: adjustment.destLocationId,
        deltaQty: delta,
        balanceAfter: newBalance,
        referenceType: 'ADJUSTMENT',
        referenceDoc: adjustment.reference,
        actorId: req.user.id,
        notes: `Physical count adjustment: counted=${countedQty}, was=${liveBalance}, delta=${delta > 0 ? '+' : ''}${delta}. Reason: ${adjustment.notes || 'N/A'}`,
      });

      return tx.operation.update({
        where: { id: adjustment.id },
        data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
        include: ADJUSTMENT_INCLUDE,
      });
    });

    res.json({ success: true, message: 'Adjustment validated and stock updated', data: result });
  } catch (e) { next(e); }
};

/** Cancel (DRAFT → CANCELED). Never touches stock. */
export const cancelAdjustment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'ADJUSTMENT') throw new NotFoundError('Adjustment not found');
    if (op.status === 'DONE') throw new AppError('A validated adjustment cannot be canceled', 400);
    if (op.status === 'CANCELED') throw new AppError('Adjustment is already canceled', 400);
    const updated = await prisma.operation.update({
      where: { id }, data: { status: 'CANCELED', version: { increment: 1 } }, include: ADJUSTMENT_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

function checkQuantities(body: any): void {
  for (const key of ['demandQty', 'doneQty', 'countedQty', 'initialStock', 'reorderThreshold']) {
    if (body[key] !== undefined) assertQuantity(body[key]);
  }
  if (Array.isArray(body.lines)) body.lines.forEach(checkQuantities);
}
