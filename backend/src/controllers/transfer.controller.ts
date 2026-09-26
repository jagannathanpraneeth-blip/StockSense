/**
 * Internal Transfer Controller — WH/INT operations.
 *
 * Status flow: DRAFT → DONE (validate) | CANCELED
 *
 * Validation atomically:
 *   1. Checks version (concurrency lock)
 *   2. Verifies source != destination
 *   3. Checks available stock at source for ALL lines
 *   4. Deducts from source AND adds to destination in same transaction
 *   5. Writes paired ledger entries (source negative, destination positive)
 *   6. Marks DONE
 *
 * Total company quantity for each product is conserved:
 *   source.balance decreases by qty; destination.balance increases by same qty.
 *   Both operations are in a single $transaction — rollback on any failure.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { roundQuantity, addQuantities } from '../utils/quantity';
import {
  generateReference,
  deductStock,
  addStock,
  writeLedger,
  assertSafeQuantity,
} from '../services/stock.service';

// ─── Schemas ────────────────────────────────────────────────────────────────

const lineInputSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  demandQty: z.number().positive('Demand quantity must be positive'),
});

const createSchema = z.object({
  sourceLocationId: z.string().min(1, 'Source location is required'),
  destLocationId: z.string().min(1, 'Destination location is required'),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineInputSchema).min(1, 'At least one product line is required'),
});

const updateSchema = z.object({
  sourceLocationId: z.string().optional(),
  destLocationId: z.string().optional(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  version: z.number().int().min(0),
});

const lineUpdateSchema = z.object({
  demandQty: z.number().positive().optional(),
});

const validateSchema = z.object({
  version: z.number().int().min(0),
});

// ─── Include helper ─────────────────────────────────────────────────────────

const TRANSFER_INCLUDE = {
  sourceLocation: {
    select: { id: true, name: true, code: true, warehouse: { select: { id: true, name: true, code: true } } },
  },
  destLocation: {
    select: { id: true, name: true, code: true, warehouse: { select: { id: true, name: true, code: true } } },
  },
  createdBy: { select: { id: true, name: true, email: true } },
  lines: {
    include: { product: { select: { id: true, name: true, sku: true, uom: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { lines: true } },
};

// ─── Controllers ────────────────────────────────────────────────────────────

export const listTransfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;
    const where: any = { type: 'INTERNAL_TRANSFER' };
    if (status && typeof status === 'string' && status !== 'ALL') where.status = status.toUpperCase();
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [{ reference: { contains: q } }, { notes: { contains: q } }];
    }
    const transfers = await prisma.operation.findMany({ where, orderBy: { createdAt: 'desc' }, include: TRANSFER_INCLUDE });
    res.json({ success: true, data: transfers });
  } catch (e) { next(e); }
};

export const getTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.operation.findUnique({ where: { id: req.params.id }, include: TRANSFER_INCLUDE });
    if (!t || t.type !== 'INTERNAL_TRANSFER') throw new NotFoundError('Transfer not found');
    res.json({ success: true, data: t });
  } catch (e) { next(e); }
};

export const createTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);

    if (data.sourceLocationId === data.destLocationId) {
      throw new AppError('Source and destination locations must be different', 400);
    }

    const [srcLoc, dstLoc] = await Promise.all([
      prisma.location.findUnique({ where: { id: data.sourceLocationId } }),
      prisma.location.findUnique({ where: { id: data.destLocationId } }),
    ]);
    if (!srcLoc) throw new NotFoundError('Source location not found');
    if (!dstLoc) throw new NotFoundError('Destination location not found');

    const result = await prisma.$transaction(async (tx) => {
      const reference = await generateReference(tx, 'INTERNAL_TRANSFER', 'WH/INT');
      const op = await tx.operation.create({
        data: {
          reference,
          type: 'INTERNAL_TRANSFER',
          status: 'DRAFT',
          sourceLocationId: data.sourceLocationId,
          destLocationId: data.destLocationId,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          notes: data.notes,
          createdById: req.user.id,
        },
      });
      for (const line of data.lines) {
        assertSafeQuantity(line.demandQty, 'Demand quantity');
        await tx.operationLine.create({
          data: {
            operationId: op.id,
            productId: line.productId,
            demandQty: roundQuantity(line.demandQty),
            doneQty: 0,
            sourceLocationId: data.sourceLocationId,
            destLocationId: data.destLocationId,
          },
        });
      }
      return tx.operation.findUnique({ where: { id: op.id }, include: TRANSFER_INCLUDE });
    });

    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const updateTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);
    const existing = await prisma.operation.findUnique({ where: { id } });
    if (!existing || existing.type !== 'INTERNAL_TRANSFER') throw new NotFoundError('Transfer not found');
    if (existing.status !== 'DRAFT') throw new AppError('Only DRAFT transfers can be updated', 400);
    if (existing.version !== data.version) throw new ConflictError('Transfer was modified concurrently. Refresh and retry.');

    if (data.sourceLocationId && data.destLocationId && data.sourceLocationId === data.destLocationId) {
      throw new AppError('Source and destination must be different', 400);
    }

    const updated = await prisma.operation.update({
      where: { id },
      data: {
        ...(data.sourceLocationId && { sourceLocationId: data.sourceLocationId }),
        ...(data.destLocationId && { destLocationId: data.destLocationId }),
        ...(data.expectedDate !== undefined && { expectedDate: data.expectedDate ? new Date(data.expectedDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
        version: { increment: 1 },
      },
      include: TRANSFER_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const addLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = lineInputSchema.parse(req.body);
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'INTERNAL_TRANSFER') throw new NotFoundError('Transfer not found');
    if (op.status !== 'DRAFT') throw new AppError('Lines can only be added to DRAFT transfers', 400);
    const prod = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!prod) throw new NotFoundError('Product not found');
    assertSafeQuantity(data.demandQty);
    const line = await prisma.operationLine.create({
      data: {
        operationId: id,
        productId: data.productId,
        demandQty: roundQuantity(data.demandQty),
        doneQty: 0,
        sourceLocationId: op.sourceLocationId,
        destLocationId: op.destLocationId,
      },
      include: { product: { select: { id: true, name: true, sku: true, uom: true } } },
    });
    res.status(201).json({ success: true, data: line });
  } catch (e) { next(e); }
};

export const updateLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, lineId } = req.params;
    const data = lineUpdateSchema.parse(req.body);
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'INTERNAL_TRANSFER') throw new NotFoundError('Transfer not found');
    if (op.status !== 'DRAFT') throw new AppError('Cannot edit lines on a non-draft transfer', 400);
    const existing = await prisma.operationLine.findFirst({ where: { id: lineId, operationId: id } });
    if (!existing) throw new NotFoundError('Line not found');
    if (data.demandQty !== undefined) assertSafeQuantity(data.demandQty);
    const line = await prisma.operationLine.update({
      where: { id: lineId },
      data: { ...(data.demandQty !== undefined && { demandQty: roundQuantity(data.demandQty) }) },
      include: { product: { select: { id: true, name: true, sku: true, uom: true } } },
    });
    res.json({ success: true, data: line });
  } catch (e) { next(e); }
};

export const deleteLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, lineId } = req.params;
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'INTERNAL_TRANSFER') throw new NotFoundError('Transfer not found');
    if (op.status !== 'DRAFT') throw new AppError('Lines can only be deleted from DRAFT transfers', 400);
    await prisma.operationLine.deleteMany({ where: { id: lineId, operationId: id } });
    res.json({ success: true, message: 'Line deleted' });
  } catch (e) { next(e); }
};

/**
 * Validate: DRAFT → DONE
 * Atomic: deduct source, add dest, write paired ledger entries.
 * Total company quantity conserved; rollback on any failure.
 * Requires INVENTORY_MANAGER or ADMIN role.
 */
export const validateTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { version } = validateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.operation.findUnique({ where: { id }, include: { lines: true } });
      if (!transfer || transfer.type !== 'INTERNAL_TRANSFER') throw new NotFoundError('Transfer not found');
      if (transfer.status === 'DONE') throw new AppError('Transfer is already validated', 400);
      if (transfer.status !== 'DRAFT') throw new AppError('Only DRAFT transfers can be validated', 400);
      if (transfer.version !== version) throw new ConflictError('Transfer was modified concurrently. Refresh and retry.');
      if (transfer.lines.length === 0) throw new AppError('Cannot validate an empty transfer', 400);
      if (!transfer.sourceLocationId || !transfer.destLocationId) throw new AppError('Source and destination locations are required', 400);
      if (transfer.sourceLocationId === transfer.destLocationId) throw new AppError('Source and destination must be different', 400);

      // Aggregate by productId
      const aggregated = new Map<string, number>();
      for (const line of transfer.lines) {
        const qty = roundQuantity(line.demandQty);
        if (qty <= 0) continue;
        aggregated.set(line.productId, addQuantities(aggregated.get(line.productId) ?? 0, qty));
      }
      if (aggregated.size === 0) throw new AppError('No lines have a positive quantity to transfer', 400);

      // Pre-check all source balances before touching any
      for (const [productId, qty] of aggregated) {
        assertSafeQuantity(qty);
        const balance = await tx.stockBalance.findUnique({
          where: { productId_locationId: { productId, locationId: transfer.sourceLocationId } },
        });
        const available = balance ? roundQuantity(balance.quantity) : 0;
        if (available < qty) {
          const prod = await tx.product.findUnique({ where: { id: productId }, select: { name: true, sku: true } });
          throw new AppError(
            `Insufficient stock for ${prod?.name ?? productId} at source. ` +
            `Available: ${available}, Requested: ${qty}. No balances changed.`,
            400
          );
        }
      }

      // Deduct source, add destination, write paired ledger entries
      for (const [productId, qty] of aggregated) {
        const newSrcBalance = await deductStock(tx, productId, transfer.sourceLocationId, qty);
        const newDstBalance = await addStock(tx, productId, transfer.destLocationId, qty);

        // Source ledger entry (negative delta)
        await writeLedger(tx, {
          operationId: transfer.id,
          productId,
          locationId: transfer.sourceLocationId,
          deltaQty: -qty,
          balanceAfter: newSrcBalance,
          referenceType: 'INTERNAL_TRANSFER',
          referenceDoc: transfer.reference,
          actorId: req.user.id,
          notes: `Transfer out: ${transfer.reference} → ${transfer.destLocationId}`,
        });

        // Destination ledger entry (positive delta)
        await writeLedger(tx, {
          operationId: transfer.id,
          productId,
          locationId: transfer.destLocationId,
          deltaQty: qty,
          balanceAfter: newDstBalance,
          referenceType: 'INTERNAL_TRANSFER',
          referenceDoc: transfer.reference,
          actorId: req.user.id,
          notes: `Transfer in: ${transfer.reference} ← ${transfer.sourceLocationId}`,
        });
      }

      return tx.operation.update({
        where: { id: transfer.id },
        data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
        include: TRANSFER_INCLUDE,
      });
    });

    res.json({ success: true, message: 'Transfer validated. Stock moved atomically.', data: result });
  } catch (e) { next(e); }
};

/** Cancel (DRAFT → CANCELED). Never touches stock. */
export const cancelTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'INTERNAL_TRANSFER') throw new NotFoundError('Transfer not found');
    if (op.status === 'DONE') throw new AppError('A completed transfer cannot be canceled', 400);
    if (op.status === 'CANCELED') throw new AppError('Transfer is already canceled', 400);
    const updated = await prisma.operation.update({
      where: { id }, data: { status: 'CANCELED', version: { increment: 1 } }, include: TRANSFER_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};
