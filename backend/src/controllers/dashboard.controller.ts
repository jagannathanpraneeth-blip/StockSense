import { Request, Response, NextFunction } from 'express';
import prisma from '../db/client';
import { roundQuantity } from '../utils/quantity';

/**
 * Dashboard stats — all values sourced from live DB queries.
 *
 * "Products in stock" = distinct SKUs with at least one location balance > 0.
 * Quantities are NOT summed across incompatible UOMs (see low-stock section).
 * Low-stock check is per-product: total across all locations vs reorderThreshold.
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Total active products
    const totalProducts = await prisma.product.count({ where: { isActive: true } });

    // Products with at least one positive balance (distinct SKUs in stock)
    const inStockProducts = await prisma.product.count({
      where: {
        isActive: true,
        stockBalances: { some: { quantity: { gt: 0 } } },
      },
    });

    // Low stock: active products where sum of all location balances <= reorderThreshold
    // We fetch and compute in application layer to respect 4-decimal precision
    const productsWithStock = await prisma.product.findMany({
      where: { isActive: true, reorderThreshold: { gt: 0 } },
      include: { stockBalances: { select: { quantity: true } } },
    });
    const lowStockCount = productsWithStock.filter((p) => {
      const total = roundQuantity(p.stockBalances.reduce((s, b) => s + b.quantity, 0));
      return total <= p.reorderThreshold;
    }).length;

    // Operation counts
    const [receiptsTotal, receiptsThisWeek, deliveriesTotal, transfersTotal, adjustmentsTotal] =
      await Promise.all([
        prisma.operation.count({ where: { type: 'RECEIPT' } }),
        prisma.operation.count({
          where: {
            type: 'RECEIPT',
            status: 'DONE',
            validatedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
          },
        }),
        prisma.operation.count({ where: { type: 'DELIVERY' } }),
        prisma.operation.count({ where: { type: 'INTERNAL_TRANSFER' } }),
        prisma.operation.count({ where: { type: 'ADJUSTMENT' } }),
      ]);

    // Draft operations awaiting action
    const [draftDeliveries, draftTransfers, draftAdjustments] = await Promise.all([
      prisma.operation.count({ where: { type: 'DELIVERY', status: { in: ['DRAFT', 'WAITING', 'READY'] } } }),
      prisma.operation.count({ where: { type: 'INTERNAL_TRANSFER', status: 'DRAFT' } }),
      prisma.operation.count({ where: { type: 'ADJUSTMENT', status: 'DRAFT' } }),
    ]);

    // Recent ledger moves (last 10)
    const recentMoves = await prisma.stockLedger.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
        location: { select: { id: true, name: true, code: true } },
        actor: { select: { id: true, name: true } },
      },
    });

    // Warehouse count
    const warehouseCount = await prisma.warehouse.count({ where: { isActive: true } });

    // Total ledger entries
    const ledgerCount = await prisma.stockLedger.count();

    res.status(200).json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          inStock: inStockProducts,
          lowStock: lowStockCount,
        },
        operations: {
          receipts: { total: receiptsTotal, thisWeek: receiptsThisWeek },
          deliveries: { total: deliveriesTotal, pending: draftDeliveries },
          transfers: { total: transfersTotal, pending: draftTransfers },
          adjustments: { total: adjustmentsTotal, pending: draftAdjustments },
        },
        warehouses: warehouseCount,
        ledgerMoves: ledgerCount,
        recentMoves,
      },
    });
  } catch (error) {
    next(error);
  }
};
