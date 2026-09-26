import { assertQuantity } from '../utils/quantity';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { roundQuantity } from '../utils/quantity';
import { generateReference } from '../services/stock.service';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  sku: z.string().trim().min(1, 'Product SKU is required').max(50).toUpperCase(),
  categoryId: z.string().trim().min(1, 'Category is required'),
  uom: z.string().trim().min(1, 'Unit of Measure is required').max(20).default('Units'),
  reorderThreshold: z.coerce.number().min(0, 'Reorder threshold cannot be negative').default(0),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  initialStock: z.coerce.number().min(0, 'Initial stock cannot be negative').optional().default(0),
  initialLocationId: z.string().optional().nullable(),
});

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, categoryId } = req.query;

    const whereClause: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
      ];
    }

    if (categoryId && typeof categoryId === 'string' && categoryId.trim() !== '') {
      whereClause.categoryId = categoryId.trim();
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: { id: true, name: true },
        },
        stockBalances: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                code: true,
                warehouse: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
        },
      },
    });

    // Compute aggregate stock summary for each product with documented precision
    const enriched = products.map((prod) => {
      const totalStock = prod.stockBalances.reduce((sum, sb) => sum + sb.quantity, 0);
      const roundedTotal = roundQuantity(totalStock);
      const isLowStock = prod.reorderThreshold > 0 && roundedTotal <= prod.reorderThreshold;
      const isOutOfStock = roundedTotal === 0;
      const shortage = prod.reorderThreshold > 0 && roundedTotal < prod.reorderThreshold
        ? roundQuantity(prod.reorderThreshold - roundedTotal)
        : 0;
      const suggestedReplenishment = shortage;

      return {
        ...prod,
        totalStock: roundedTotal,
        isLowStock,
        isOutOfStock,
        shortage,
        suggestedReplenishment,
        reorderThreshold: roundQuantity(prod.reorderThreshold),
        stockBalances: prod.stockBalances.map((sb) => ({
          ...sb,
          quantity: roundQuantity(sb.quantity),
        })),
      };
    });

    return res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockBalances: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
          orderBy: {
            location: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    const totalStock = product.stockBalances.reduce((sum, sb) => sum + sb.quantity, 0);
    const roundedTotal = roundQuantity(totalStock);
    const isLowStock = product.reorderThreshold > 0 && roundedTotal <= product.reorderThreshold;
    const isOutOfStock = roundedTotal === 0;
    const shortage = product.reorderThreshold > 0 && roundedTotal < product.reorderThreshold
      ? roundQuantity(product.reorderThreshold - roundedTotal)
      : 0;
    const suggestedReplenishment = shortage;

    return res.status(200).json({
      success: true,
      data: {
        ...product,
        totalStock: roundedTotal,
        isLowStock,
        isOutOfStock,
        shortage,
        suggestedReplenishment,
        reorderThreshold: roundQuantity(product.reorderThreshold),
        stockBalances: product.stockBalances.map((sb) => ({
          ...sb,
          quantity: roundQuantity(sb.quantity),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = productSchema.parse(req.body);
    checkQuantities(req.body);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: validated.categoryId },
    });

    if (!category) {
      throw new NotFoundError(`Category with ID '${validated.categoryId}' not found`);
    }

    // Check duplicate SKU
    const existingSku = await prisma.product.findUnique({
      where: { sku: validated.sku },
    });

    if (existingSku) {
      throw new ConflictError(`Product with SKU '${validated.sku}' already exists`, {
        sku: [`Product with SKU '${validated.sku}' already exists. Please choose a unique SKU.`],
      });
    }

    const userRole = req.user?.role;
    const initialQty = roundQuantity(validated.initialStock || 0);

    // If initial stock is specified (>0), check authorization
    if (initialQty > 0) {
      if (userRole !== 'ADMIN' && userRole !== 'INVENTORY_MANAGER') {
        throw new AppError('Forbidden: Only Inventory Managers and Admins can create products with non-zero initial stock.', 403);
      }
      if (!validated.initialLocationId) {
        throw new AppError('Initial location is required when specifying opening stock', 400);
      }
      const initialLoc = await prisma.location.findUnique({
        where: { id: validated.initialLocationId },
      });
      if (!initialLoc || !initialLoc.isActive) {
        throw new NotFoundError('Selected initial stock location is invalid or inactive');
      }
    }

    // Create product and initialize stock atomically inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create product
      const prod = await tx.product.create({
        data: {
          name: validated.name.trim(),
          sku: validated.sku.trim(),
          categoryId: validated.categoryId,
          uom: validated.uom.trim(),
          reorderThreshold: roundQuantity(validated.reorderThreshold),
          description: validated.description?.trim() || null,
          isActive: validated.isActive,
        },
        include: { category: true },
      });

      // 2. Fetch all active locations
      const locations = await tx.location.findMany({ where: { isActive: true } });

      // 3. Create stock balances for all active locations
      if (locations.length > 0) {
        await tx.stockBalance.createMany({
          data: locations.map((loc) => ({
            productId: prod.id,
            locationId: loc.id,
            quantity: loc.id === validated.initialLocationId ? initialQty : 0.0,
          })),
        });
      }

      // 4. If initial stock > 0, create audited ADJUSTMENT operation and write to StockLedger
      if (initialQty > 0 && validated.initialLocationId) {
        const reference = await generateReference(tx, 'ADJUSTMENT', 'WH/ADJ');
        const adjOp = await tx.operation.create({
          data: {
            reference,
            type: 'ADJUSTMENT',
            status: 'DONE',
            destLocationId: validated.initialLocationId,
            notes: 'Opening stock on product creation',
            createdById: req.user?.id || req.session.userId || null,
            validatedAt: new Date(),
            lines: {
              create: [
                {
                  productId: prod.id,
                  demandQty: initialQty,
                  doneQty: initialQty,
                  balanceSnapshot: 0.0,
                  destLocationId: validated.initialLocationId,
                },
              ],
            },
          },
        });

        await tx.stockLedger.create({
          data: {
            operationId: adjOp.id,
            productId: prod.id,
            locationId: validated.initialLocationId,
            deltaQty: initialQty,
            balanceAfter: initialQty,
            referenceType: 'ADJUSTMENT',
            referenceDoc: reference,
            actorId: req.user?.id || req.session.userId || null,
            notes: 'Opening stock on product creation',
          },
        });
      }

      return prod;
    });

    // Return created product with stockBalances
    const createdWithBalances = await prisma.product.findUnique({
      where: { id: result.id },
      include: {
        category: true,
        stockBalances: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        ...createdWithBalances,
        totalStock: initialQty,
        isLowStock: result.reorderThreshold > 0 && initialQty <= result.reorderThreshold,
        isOutOfStock: initialQty === 0,
        shortage: result.reorderThreshold > 0 && initialQty < result.reorderThreshold
          ? roundQuantity(result.reorderThreshold - initialQty)
          : 0,
        suggestedReplenishment: result.reorderThreshold > 0 && initialQty < result.reorderThreshold
          ? roundQuantity(result.reorderThreshold - initialQty)
          : 0,
      },
      message: 'Product created successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validated = productSchema.parse(req.body);
    checkQuantities(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: validated.categoryId },
    });

    if (!category) {
      throw new NotFoundError(`Category with ID '${validated.categoryId}' not found`);
    }

    // Check duplicate SKU
    const duplicateSku = await prisma.product.findFirst({
      where: {
        sku: validated.sku,
        id: { not: id },
      },
    });

    if (duplicateSku) {
      throw new ConflictError(`Product with SKU '${validated.sku}' already exists`, {
        sku: [`Product with SKU '${validated.sku}' already exists. Please choose a unique SKU.`],
      });
    }

    if (validated.uom.trim() !== existingProduct.uom && await prisma.stockLedger.count({ where: { productId: id } })) {
      throw new ConflictError('Unit of measure cannot change after stock movements. Create a new SKU.');
    }

    // Note: Stock balances are NOT directly editable through product edit.
    // Stock balance updates occur strictly via ledger & operations in Stage 2.
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        sku: validated.sku.trim(),
        categoryId: validated.categoryId,
        uom: validated.uom.trim(),
        reorderThreshold: roundQuantity(validated.reorderThreshold),
        description: validated.description?.trim() || null,
        isActive: validated.isActive,
      },
      include: {
        category: true,
        stockBalances: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
        },
      },
    });

    const totalStock = updated.stockBalances.reduce((sum, sb) => sum + sb.quantity, 0);
    const roundedTotal = roundQuantity(totalStock);
    const isLowStock = updated.reorderThreshold > 0 && roundedTotal <= updated.reorderThreshold;

    return res.status(200).json({
      success: true,
      data: {
        ...updated,
        totalStock: roundedTotal,
        isLowStock,
        reorderThreshold: roundQuantity(updated.reorderThreshold),
        stockBalances: updated.stockBalances.map((sb) => ({
          ...sb,
          quantity: roundQuantity(sb.quantity),
        })),
      },
      message: 'Product updated successfully',
    });
  } catch (error) {
    return next(error);
  }
}

function checkQuantities(body: any): void {
  for (const key of ['demandQty', 'doneQty', 'countedQty', 'initialStock', 'reorderThreshold']) {
    if (body[key] !== undefined) assertQuantity(body[key]);
  }
  if (Array.isArray(body.lines)) body.lines.forEach(checkQuantities);
}
