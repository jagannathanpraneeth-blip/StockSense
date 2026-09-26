/**
 * Delivery Controller — WH/OUT operations.
 *
 * Status flow: DRAFT → WAITING (start picking) → READY (confirm ready) → DONE (validate)
 *              DRAFT|WAITING|READY → CANCELED (no stock impact)
 *
 * Stock is only deducted on VALIDATE (DONE).
 * Draft creation, picking, and packing never touch stock balances.
 * Stock is checked at validation time — no reservations are implemented.
 *
 * Concurrency: version field prevents double-validation via optimistic lock
 * inside a serializable SQLite transaction.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { roundQuantity, addQuantities } from '../utils/quantity';
import {
  generateReference,
  deductStock,
  writeLedger,
  assertSafeQuantity,
} from '../services/stock.service';

// ─── Schemas ────────────────────────────────────────────────────────────────

const lineInputSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  demandQty: z.number().positive('Demand quantity must be positive'),
  doneQty: z.number().min(0).optional().default(0),
});

const createSchema = z.object({
  partner: z.string().min(1, 'Customer/Partner is required'),
  sourceLocationId: z.string().min(1, 'Source location is required'),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineInputSchema).optional().default([]),
});

const updateSchema = z.object({
  partner: z.string().optional(),
  sourceLocationId: z.string().optional(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  version: z.number().int().min(0),
});

const lineUpdateSchema = z.object({
  demandQty: z.number().min(0).optional(),
  doneQty: z.number().min(0).optional(),
});

const validateSchema = z.object({
  version: z.number().int().min(0),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const DELIVERY_INCLUDE = {
  sourceLocation: {
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

export const listDeliveries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;
    const where: any = { type: 'DELIVERY' };
    if (status && typeof status === 'string' && status !== 'ALL') where.status = status.toUpperCase();
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { reference: { contains: q } },
        { partner: { contains: q } },
        { notes: { contains: q } },
      ];
    }
    const deliveries = await prisma.operation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: DELIVERY_INCLUDE,
    });
    res.json({ success: true, data: deliveries });
  } catch (e) { next(e); }
};

export const getDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const d = await prisma.operation.findUnique({ where: { id: req.params.id }, include: DELIVERY_INCLUDE });
    if (!d || d.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    res.json({ success: true, data: d });
  } catch (e) { next(e); }
};

export const createDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    const srcLoc = await prisma.location.findUnique({ where: { id: data.sourceLocationId } });
    if (!srcLoc) throw new NotFoundError('Source location not found');

    const result = await prisma.$transaction(async (tx) => {
      const reference = await generateReference(tx, 'DELIVERY', 'WH/OUT');
      const op = await tx.operation.create({
        data: {
          reference,
          type: 'DELIVERY',
          status: 'DRAFT',
          partner: data.partner,
          sourceLocationId: data.sourceLocationId,
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
            doneQty: roundQuantity(line.doneQty || 0),
            sourceLocationId: data.sourceLocationId,
          },
        });
      }
      return tx.operation.findUnique({ where: { id: op.id }, include: DELIVERY_INCLUDE });
    });

    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const updateDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);
    const existing = await prisma.operation.findUnique({ where: { id } });
    if (!existing || existing.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    if (!['DRAFT', 'WAITING'].includes(existing.status)) throw new AppError('Only DRAFT or WAITING deliveries can be updated', 400);
    if (existing.version !== data.version) throw new ConflictError('Delivery was modified concurrently. Refresh and retry.');

    const updated = await prisma.operation.update({
      where: { id },
      data: {
        ...(data.partner !== undefined && { partner: data.partner }),
        ...(data.sourceLocationId !== undefined && { sourceLocationId: data.sourceLocationId }),
        ...(data.expectedDate !== undefined && { expectedDate: data.expectedDate ? new Date(data.expectedDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
        version: { increment: 1 },
      },
      include: DELIVERY_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

export const addLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = lineInputSchema.parse(req.body);
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    if (!['DRAFT', 'WAITING'].includes(op.status)) throw new AppError('Lines can only be added to DRAFT or WAITING deliveries', 400);
    const prod = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!prod) throw new NotFoundError('Product not found');
    assertSafeQuantity(data.demandQty, 'Demand quantity');
    const line = await prisma.operationLine.create({
      data: {
        operationId: id,
        productId: data.productId,
        demandQty: roundQuantity(data.demandQty),
        doneQty: roundQuantity(data.doneQty || 0),
        sourceLocationId: op.sourceLocationId,
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
    if (!op || op.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    if (!['DRAFT', 'WAITING', 'READY'].includes(op.status)) throw new AppError('Cannot edit lines on a completed delivery', 400);
    const existing = await prisma.operationLine.findFirst({ where: { id: lineId, operationId: id } });
    if (!existing) throw new NotFoundError('Line not found');
    const updateData: any = {};
    if (data.demandQty !== undefined) { assertSafeQuantity(data.demandQty); updateData.demandQty = roundQuantity(data.demandQty); }
    if (data.doneQty !== undefined) { assertSafeQuantity(data.doneQty); updateData.doneQty = roundQuantity(data.doneQty); }
    const line = await prisma.operationLine.update({
      where: { id: lineId },
      data: updateData,
      include: { product: { select: { id: true, name: true, sku: true, uom: true } } },
    });
    res.json({ success: true, data: line });
  } catch (e) { next(e); }
};

export const deleteLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, lineId } = req.params;
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    if (!['DRAFT', 'WAITING'].includes(op.status)) throw new AppError('Lines can only be deleted from DRAFT or WAITING deliveries', 400);
    await prisma.operationLine.deleteMany({ where: { id: lineId, operationId: id } });
    res.json({ success: true, message: 'Line deleted' });
  } catch (e) { next(e); }
};

/** DRAFT → WAITING: marks picking started (no stock change) */
export const startPicking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    if (op.status !== 'DRAFT') throw new AppError('Only DRAFT deliveries can be set to picking', 400);
    if (!op.sourceLocationId) throw new AppError('Source location is required before picking', 400);
    const lines = await prisma.operationLine.count({ where: { operationId: id } });
    if (lines === 0) throw new AppError('Cannot start picking on a delivery with no line items', 400);
    const updated = await prisma.operation.update({
      where: { id }, data: { status: 'WAITING', version: { increment: 1 } }, include: DELIVERY_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

/** WAITING → READY: marks picking and packing complete (no stock change) */
export const markReady = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    if (op.status !== 'WAITING') throw new AppError('Only WAITING deliveries can be marked ready', 400);
    const updated = await prisma.operation.update({
      where: { id }, data: { status: 'READY', version: { increment: 1 } }, include: DELIVERY_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};

/** READY → DONE: validates and deducts stock atomically. Requires INVENTORY_MANAGER or ADMIN. */
export const validateDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { version } = validateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.operation.findUnique({ where: { id }, include: { lines: true } });
      if (!delivery || delivery.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
      if (delivery.status === 'DONE') throw new AppError('Delivery is already validated', 400);
      if (delivery.status !== 'READY') throw new AppError(`Delivery must be in READY status to validate (current: ${delivery.status}). Complete picking and packing first.`, 400);
      if (delivery.version !== version) throw new ConflictError('Delivery was modified concurrently. Refresh and retry.');
      if (delivery.lines.length === 0) throw new AppError('Cannot validate an empty delivery', 400);
      if (!delivery.sourceLocationId) throw new AppError('Source location is required', 400);

      // Aggregate lines by productId to prevent duplicate product issues
      const aggregated = new Map<string, number>();
      for (const line of delivery.lines) {
        const qty = roundQuantity(line.doneQty > 0 ? line.doneQty : line.demandQty);
        if (qty <= 0) continue;
        aggregated.set(line.productId, addQuantities(aggregated.get(line.productId) ?? 0, qty));
      }

      if (aggregated.size === 0) throw new AppError('No lines have a positive quantity to deliver', 400);

      // Pre-check: verify availability for ALL lines before deducting ANY
      // This ensures partial-application never happens on multi-line failure
      for (const [productId, qty] of aggregated) {
        assertSafeQuantity(qty);
        const balance = await tx.stockBalance.findUnique({
          where: { productId_locationId: { productId, locationId: delivery.sourceLocationId } },
        });
        const available = balance ? roundQuantity(balance.quantity) : 0;
        if (available < qty) {
          const prod = await tx.product.findUnique({ where: { id: productId }, select: { name: true, sku: true } });
          throw new AppError(
            `Insufficient stock for ${prod?.name ?? productId} (${prod?.sku ?? ''}). ` +
            `Available: ${available}, Requested: ${qty}. Operation rejected — no balances changed.`,
            400
          );
        }
      }

      // All checks passed — now atomically deduct and write ledger
      for (const [productId, qty] of aggregated) {
        const newBalance = await deductStock(tx, productId, delivery.sourceLocationId, qty);
        await writeLedger(tx, {
          operationId: delivery.id,
          productId,
          locationId: delivery.sourceLocationId,
          deltaQty: -qty,
          balanceAfter: newBalance,
          referenceType: 'DELIVERY',
          referenceDoc: delivery.reference,
          actorId: req.user.id,
          notes: `Outgoing delivery ${delivery.reference}${delivery.partner ? ` to ${delivery.partner}` : ''}`,
        });
      }

      // Mark DONE with version bump (prevents double-validate)
      return tx.operation.update({
        where: { id: delivery.id },
        data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
        include: DELIVERY_INCLUDE,
      });
    });

    res.json({ success: true, message: 'Delivery validated and stock deducted', data: result });
  } catch (e) { next(e); }
};

/** Cancel a delivery (DRAFT|WAITING|READY → CANCELED). Never touches stock. */
export const cancelDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const op = await prisma.operation.findUnique({ where: { id } });
    if (!op || op.type !== 'DELIVERY') throw new NotFoundError('Delivery not found');
    if (op.status === 'DONE') throw new AppError('A completed delivery cannot be canceled', 400);
    if (op.status === 'CANCELED') throw new AppError('Delivery is already canceled', 400);
    const updated = await prisma.operation.update({
      where: { id }, data: { status: 'CANCELED', version: { increment: 1 } }, include: DELIVERY_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
};
