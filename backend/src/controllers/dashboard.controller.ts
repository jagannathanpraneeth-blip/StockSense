import { Request, Response, NextFunction } from 'express';
import prisma from '../db/client';
import { roundQuantity } from '../utils/quantity';

/**
 * Dashboard stats — all values sourced from live DB queries.
 *
 * Supports dynamic filters:
 * - `warehouseId`: filters location balances, low stock, operations, and recent moves.
 * - `categoryId`: filters products and stock counts by category.
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouseId, categoryId, locationId, type, status } = req.query;

    const productWhere: Record<string, any> = { isActive: true };
    if (categoryId && typeof categoryId === 'string' && categoryId.trim() !== '') {
      productWhere.categoryId = categoryId.trim();
    }

    // Total active products (subject to category filter)
    const totalProducts = await prisma.product.count({ where: productWhere });

    // Stock balance location filtering
    let locationIds: string[] | undefined;
    if (warehouseId && typeof warehouseId === 'string' && warehouseId.trim() !== '') {
      const locs = await prisma.location.findMany({
        where: { warehouseId: warehouseId.trim(), isActive: true },
        select: { id: true },
      });
      locationIds = locs.map((l) => l.id);
    }

    if (typeof locationId === 'string' && locationId) {
      locationIds = locationIds ? locationIds.filter(id => id === locationId) : [locationId];
    }

    // Fetch products with their stock balances to compute live metrics
    const productsWithStock = await prisma.product.findMany({
      where: productWhere,
      include: {
        stockBalances: {
          where: locationIds ? { locationId: { in: locationIds } } : undefined,
          select: { quantity: true, locationId: true },
        },
      },
    });

    const globalBalances = await prisma.stockBalance.findMany({ where: { product: productWhere } });
    const globalTotals = new Map<string, number>();
    for (const balance of globalBalances) globalTotals.set(balance.productId, roundQuantity((globalTotals.get(balance.productId) || 0) + balance.quantity));
    let inStockProducts = 0;
    let outOfStockProducts = 0;
    let lowStockCount = 0;

    for (const prod of productsWithStock) {
      const total = roundQuantity(prod.stockBalances.reduce((sum, sb) => sum + sb.quantity, 0));
      if (total > 0) {
        inStockProducts++;
      } else {
        outOfStockProducts++;
      }
      if (prod.reorderThreshold > 0 && (globalTotals.get(prod.id) || 0) <= prod.reorderThreshold) {
        lowStockCount++;
      }
    }

    // Operation query filters
    const opWhere: Record<string, any> = {};
    if (locationIds) {
      opWhere.OR = [
        { sourceLocationId: { in: locationIds } },
        { destLocationId: { in: locationIds } },
      ];
    }

    const selected: any[] = [];
    if (typeof type === 'string' && type) selected.push({ type });
    if (typeof status === 'string' && status) selected.push({ status });
    if (typeof categoryId === 'string' && categoryId) selected.push({ lines: { some: { product: { categoryId } } } });
    if (selected.length) opWhere.AND = selected;

    const filteredOperations = await prisma.operation.findMany({ where: opWhere, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, reference: true, type: true, status: true, partner: true, expectedDate: true } });
    const [
      receiptsTotal,
      receiptsPending,
      receiptsThisWeek,
      deliveriesTotal,
      deliveriesPending,
      transfersTotal,
      transfersPending,
      transfersScheduled,
      adjustmentsTotal,
      adjustmentsPending,
    ] = await Promise.all([
      // Receipts
      prisma.operation.count({ where: { ...opWhere, type: 'RECEIPT' } }),
      prisma.operation.count({ where: { ...opWhere, type: 'RECEIPT', status: { in: ['DRAFT', 'WAITING', 'READY'] } } }),
      prisma.operation.count({
        where: {
          ...opWhere,
          type: 'RECEIPT',
          status: 'DONE',
          validatedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
        },
      }),

      // Deliveries
      prisma.operation.count({ where: { ...opWhere, type: 'DELIVERY' } }),
      prisma.operation.count({ where: { ...opWhere, type: 'DELIVERY', status: { in: ['DRAFT', 'WAITING', 'READY'] } } }),

      // Internal Transfers
      prisma.operation.count({ where: { ...opWhere, type: 'INTERNAL_TRANSFER' } }),
      prisma.operation.count({ where: { ...opWhere, type: 'INTERNAL_TRANSFER', status: 'DRAFT' } }),
      prisma.operation.count({
        where: {
          ...opWhere,
          type: 'INTERNAL_TRANSFER',
          status: 'DRAFT',
          expectedDate: { not: null },
        },
      }),

      // Adjustments
      prisma.operation.count({ where: { ...opWhere, type: 'ADJUSTMENT' } }),
      prisma.operation.count({ where: { ...opWhere, type: 'ADJUSTMENT', status: 'DRAFT' } }),
    ]);

    // Recent ledger moves
    const recentMovesWhere: Record<string, any> = {};
    if (locationIds) {
      recentMovesWhere.locationId = { in: locationIds };
    }
    if (categoryId && typeof categoryId === 'string' && categoryId.trim() !== '') {
      recentMovesWhere.product = { categoryId: categoryId.trim() };
    }

    if (typeof type === 'string' && type) recentMovesWhere.operation = { ...(recentMovesWhere.operation || {}), type };
    if (typeof status === 'string' && status) recentMovesWhere.operation = { ...(recentMovesWhere.operation || {}), status };

    const recentMoves = await prisma.stockLedger.findMany({
      where: recentMovesWhere,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
        location: { select: { id: true, name: true, code: true, warehouse: { select: { name: true, code: true } } } },
        actor: { select: { id: true, name: true } },
      },
    });

    const warehouseCount = await prisma.warehouse.count({ where: { isActive: true } });
    const ledgerCount = await prisma.stockLedger.count({ where: recentMovesWhere });

    res.status(200).json({
      success: true,
      data: {
        filteredOperations,
        products: {
          total: totalProducts,
          inStock: inStockProducts,
          outOfStock: outOfStockProducts,
          lowStock: lowStockCount,
        },
        operations: {
          receipts: { total: receiptsTotal, pending: receiptsPending, thisWeek: receiptsThisWeek },
          deliveries: { total: deliveriesTotal, pending: deliveriesPending },
          transfers: { total: transfersTotal, pending: transfersPending, scheduled: transfersScheduled },
          adjustments: { total: adjustmentsTotal, pending: adjustmentsPending },
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
