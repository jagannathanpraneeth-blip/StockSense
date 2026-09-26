import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { roundQuantity, addQuantities, isValidQuantity } from '../utils/quantity';

// --- Schemas ---

const receiptLineInputSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  demandQty: z.number().positive('Demand quantity must be greater than 0'),
  doneQty: z.number().min(0, 'Done quantity cannot be negative').optional().default(0),
});

const createReceiptSchema = z.object({
  partner: z.string().min(1, 'Partner (Supplier) is required'),
  destLocationId: z.string().min(1, 'Destination Location is required'),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(receiptLineInputSchema).optional().default([]),
});

const updateReceiptSchema = z.object({
  partner: z.string().optional(),
  destLocationId: z.string().optional(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  version: z.number().int('Version must be an integer').min(0, 'Version is required for optimistic locking'),
});

const addLineSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  demandQty: z.number().positive('Demand quantity must be greater than 0'),
  doneQty: z.number().min(0, 'Done quantity cannot be negative').optional().default(0),
});

const updateLineSchema = z.object({
  demandQty: z.number().min(0, 'Demand quantity must be non-negative').optional(),
  doneQty: z.number().min(0, 'Done quantity must be non-negative').optional(),
});

// Helper to generate reference WH/IN/XXXX
async function generateReceiptReference(): Promise<string> {
  const count = await prisma.operation.count({ where: { type: 'RECEIPT' } });
  const seq = (count + 1).toString().padStart(4, '0');
  const ref = `WH/IN/${seq}`;
  
  // Verify reference doesn't collide
  const existing = await prisma.operation.findUnique({ where: { reference: ref } });
  if (existing) {
    const timestamp = Date.now().toString().slice(-4);
    return `WH/IN/${seq}-${timestamp}`;
  }
  return ref;
}

// --- Controllers ---

export const listReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;

    const where: any = { type: 'RECEIPT' };
    if (status && typeof status === 'string' && status.trim() !== '') {
      where.status = status.trim().toUpperCase();
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { reference: { contains: q } },
        { partner: { contains: q } },
        { notes: { contains: q } },
      ];
    }

    const receipts = await prisma.operation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        destLocation: {
          select: {
            id: true,
            name: true,
            code: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true } },
          },
        },
        _count: { select: { lines: true } },
      },
    });

    res.status(200).json({ success: true, data: receipts });
  } catch (error) {
    next(error);
  }
};

export const getReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.operation.findUnique({
      where: { id },
      include: {
        destLocation: {
          select: {
            id: true,
            name: true,
            code: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!receipt || receipt.type !== 'RECEIPT') {
      throw new NotFoundError('Receipt not found');
    }

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

export const createReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createReceiptSchema.parse(req.body);
    
    // Verify destination location exists
    const destLoc = await prisma.location.findUnique({ where: { id: data.destLocationId } });
    if (!destLoc) {
      throw new NotFoundError('Destination location not found');
    }

    const reference = await generateReceiptReference();
    const expDate = data.expectedDate ? new Date(data.expectedDate) : null;

    const receipt = await prisma.$transaction(async (tx) => {
      const op = await tx.operation.create({
        data: {
          reference,
          type: 'RECEIPT',
          status: 'DRAFT',
          partner: data.partner,
          destLocationId: data.destLocationId,
          expectedDate: expDate,
          notes: data.notes,
          createdById: req.user.id,
        },
      });

      if (data.lines && data.lines.length > 0) {
        for (const line of data.lines) {
          await tx.operationLine.create({
            data: {
              operationId: op.id,
              productId: line.productId,
              demandQty: roundQuantity(line.demandQty),
              doneQty: roundQuantity(line.doneQty || 0),
              destLocationId: data.destLocationId,
            },
          });
        }
      }

      return tx.operation.findUnique({
        where: { id: op.id },
        include: {
          destLocation: { select: { id: true, name: true, code: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });
    });

    res.status(201).json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

export const updateReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateReceiptSchema.parse(req.body);

    const existing = await prisma.operation.findUnique({ where: { id } });
    if (!existing || existing.type !== 'RECEIPT') throw new NotFoundError('Receipt not found');
    
    if (existing.status !== 'DRAFT') {
      throw new AppError('Only DRAFT receipts can be updated', 400);
    }
    
    if (existing.version !== data.version) {
      throw new ConflictError('Receipt has been modified by another user or session. Please refresh.');
    }

    const updatePayload: any = {
      version: { increment: 1 },
    };
    if (data.partner !== undefined) updatePayload.partner = data.partner;
    if (data.destLocationId !== undefined) updatePayload.destLocationId = data.destLocationId;
    if (data.expectedDate !== undefined) {
      updatePayload.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
    }
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    const updated = await prisma.operation.update({
      where: { id },
      data: updatePayload,
      include: {
        destLocation: { select: { id: true, name: true, code: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true } },
          },
        },
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const addLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = addLineSchema.parse(req.body);
    
    const existing = await prisma.operation.findUnique({ where: { id } });
    if (!existing || existing.type !== 'RECEIPT') throw new NotFoundError('Receipt not found');
    if (existing.status !== 'DRAFT') throw new AppError('Can only add lines to DRAFT receipts', 400);

    // Verify product exists
    const prod = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!prod) throw new NotFoundError('Product not found');

    const demandQty = roundQuantity(data.demandQty);
    const doneQty = roundQuantity(data.doneQty || 0);

    const line = await prisma.operationLine.create({
      data: {
        operationId: id,
        productId: data.productId,
        demandQty,
        doneQty,
        destLocationId: existing.destLocationId,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
      },
    });

    res.status(201).json({ success: true, data: line });
  } catch (error) {
    next(error);
  }
};

export const updateLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, lineId } = req.params;
    const data = updateLineSchema.parse(req.body);

    const operation = await prisma.operation.findUnique({ where: { id } });
    if (!operation || operation.type !== 'RECEIPT') throw new NotFoundError('Receipt not found');
    if (operation.status !== 'DRAFT') throw new AppError('Can only edit lines in DRAFT receipts', 400);

    const existingLine = await prisma.operationLine.findFirst({
      where: { id: lineId, operationId: id },
    });
    if (!existingLine) throw new NotFoundError('Line not found');

    const updateData: any = {};
    if (data.demandQty !== undefined) updateData.demandQty = roundQuantity(data.demandQty);
    if (data.doneQty !== undefined) updateData.doneQty = roundQuantity(data.doneQty);

    const line = await prisma.operationLine.update({
      where: { id: lineId },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
      },
    });

    res.status(200).json({ success: true, data: line });
  } catch (error) {
    next(error);
  }
};

export const deleteLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, lineId } = req.params;
    
    const operation = await prisma.operation.findUnique({ where: { id } });
    if (!operation || operation.type !== 'RECEIPT') throw new NotFoundError('Receipt not found');
    if (operation.status !== 'DRAFT') throw new AppError('Can only delete lines from DRAFT receipts', 400);

    await prisma.operationLine.deleteMany({
      where: { id: lineId, operationId: id },
    });

    res.status(200).json({ success: true, message: 'Line deleted' });
  } catch (error) {
    next(error);
  }
};

export const setAllDone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!operation || operation.type !== 'RECEIPT') throw new NotFoundError('Receipt not found');
    if (operation.status !== 'DRAFT') throw new AppError('Can only modify DRAFT receipts', 400);

    await prisma.$transaction(async (tx) => {
      for (const line of operation.lines) {
        await tx.operationLine.update({
          where: { id: line.id },
          data: { doneQty: line.demandQty },
        });
      }
    });

    const updated = await prisma.operation.findUnique({
      where: { id },
      include: {
        destLocation: { select: { id: true, name: true, code: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true } },
          },
        },
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const validateReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { version, autoSetDoneIfZero } = req.body;

    if (version === undefined || typeof version !== 'number') {
      throw new AppError('Version number is required for concurrency control', 400);
    }

    // Run within an atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.operation.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!receipt || receipt.type !== 'RECEIPT') throw new NotFoundError('Receipt not found');
      if (receipt.status === 'DONE') throw new AppError('Receipt is already validated', 400);
      if (receipt.status !== 'DRAFT') throw new AppError('Receipt cannot be validated from current state', 400);
      if (receipt.version !== version) {
        throw new ConflictError('Receipt was updated concurrently by another operation. Please refresh and try again.');
      }

      if (receipt.lines.length === 0) {
        throw new AppError('Cannot validate an empty receipt without line items', 400);
      }
      if (!receipt.destLocationId) {
        throw new AppError('Receipt has no destination location assigned', 400);
      }

      // Check total done quantity
      let totalDone = 0;
      for (const line of receipt.lines) {
        let done = roundQuantity(line.doneQty);
        if (done === 0 && autoSetDoneIfZero && line.demandQty > 0) {
          done = roundQuantity(line.demandQty);
          await tx.operationLine.update({
            where: { id: line.id },
            data: { doneQty: done },
          });
        }
        totalDone = addQuantities(totalDone, done);
      }

      if (totalDone <= 0) {
        throw new AppError('Cannot validate receipt: Total received quantity (Done Qty) is 0. Please set received quantities on lines before validating.', 400);
      }

      // Re-fetch updated lines
      const activeLines = await tx.operationLine.findMany({
        where: { operationId: receipt.id },
      });

      // Process each line with scaled 4-decimal precision arithmetic
      for (const line of activeLines) {
        const qtyToReceive = roundQuantity(line.doneQty);
        
        if (qtyToReceive <= 0) continue; // Skip lines with zero done qty

        // 1. Get or create stock balance for product at destLocation
        const balanceRecord = await tx.stockBalance.upsert({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: receipt.destLocationId,
            },
          },
          update: {},
          create: {
            productId: line.productId,
            locationId: receipt.destLocationId,
            quantity: 0,
          },
        });

        const currentQty = roundQuantity(balanceRecord.quantity);
        const newQty = addQuantities(currentQty, qtyToReceive);

        // 2. Update stock balance
        await tx.stockBalance.update({
          where: { id: balanceRecord.id },
          data: { quantity: newQty },
        });

        // 3. Create Stock Ledger entry
        await tx.stockLedger.create({
          data: {
            operationId: receipt.id,
            productId: line.productId,
            locationId: receipt.destLocationId,
            deltaQty: qtyToReceive,
            balanceAfter: newQty,
            referenceType: 'RECEIPT',
            referenceDoc: receipt.reference,
            actorId: req.user.id,
            notes: `Incoming stock received via ${receipt.reference}${receipt.partner ? ` from ${receipt.partner}` : ''}`,
          },
        });
      }

      // Mark receipt as DONE with incremented version
      const updatedReceipt = await tx.operation.update({
        where: { id: receipt.id },
        data: {
          status: 'DONE',
          validatedAt: new Date(),
          version: { increment: 1 },
        },
        include: {
          destLocation: { select: { id: true, name: true, code: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });

      return updatedReceipt;
    });

    res.status(200).json({
      success: true,
      message: 'Receipt validated and stock updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
