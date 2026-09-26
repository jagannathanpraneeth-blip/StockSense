import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { ConflictError, NotFoundError } from '../utils/errors';
import { roundQuantity } from '../utils/quantity';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(150),
  sku: z.string().min(1, 'Product SKU is required').max(50).toUpperCase(),
  categoryId: z.string().min(1, 'Category is required'),
  uom: z.string().min(1, 'Unit of Measure is required').max(20).default('Units'),
  reorderThreshold: z.coerce.number().min(0, 'Reorder threshold cannot be negative').default(0),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true),
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

      return {
        ...prod,
        totalStock: roundedTotal,
        isLowStock,
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

    return res.status(200).json({
      success: true,
      data: {
        ...product,
        totalStock: roundedTotal,
        isLowStock,
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

    // Create product
    const product = await prisma.product.create({
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
      },
    });

    // Initialize 0.0 stock balance records across all existing active locations
    const locations = await prisma.location.findMany({
      where: { isActive: true },
    });

    if (locations.length > 0) {
      await prisma.stockBalance.createMany({
        data: locations.map((loc) => ({
          productId: product.id,
          locationId: loc.id,
          quantity: 0.0,
        })),
      });
    }

    // Return created product with stockBalances
    const createdWithBalances = await prisma.product.findUnique({
      where: { id: product.id },
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
        totalStock: 0,
        isLowStock: product.reorderThreshold > 0,
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
