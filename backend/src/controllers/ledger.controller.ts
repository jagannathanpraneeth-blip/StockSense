import { z } from 'zod';
import { AppError } from '../utils/errors';
import { Request, Response, NextFunction } from 'express';
import prisma from '../db/client';

export const listLedgerEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, locationId, referenceType, search, dateFrom, dateTo } = req.query;

    const limit = z.coerce.number().int().min(1).max(500).default(100).parse(req.query.limit);
    const offset = z.coerce.number().int().min(0).default(0).parse(req.query.offset);
    const where: any = {};
    for (const value of [dateFrom, dateTo]) if (value && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) throw new AppError('Invalid date filter', 422);
    if (dateFrom && dateTo && new Date(String(dateFrom)) > new Date(String(dateTo))) throw new AppError('Start date must not be after end date', 422);

    if (productId && typeof productId === 'string') where.productId = productId;
    if (locationId && typeof locationId === 'string') where.locationId = locationId;
    if (referenceType && typeof referenceType === 'string' && referenceType !== 'ALL') {
      where.referenceType = referenceType;
    }
    if (dateFrom && typeof dateFrom === 'string') {
      where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
    }
    if (dateTo && typeof dateTo === 'string') {
      // Include full last day
      const end = new Date(dateTo);
      if (!dateTo.includes('T')) end.setUTCHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { referenceDoc: { contains: q } },
        { product: { name: { contains: q } } },
        { product: { sku: { contains: q } } },
        { location: { name: { contains: q } } },
        { location: { code: { contains: q } } },
        { notes: { contains: q } },
      ];
    }

    const entries = await prisma.stockLedger.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      skip: offset,
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
        location: {
          select: {
            id: true, name: true, code: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
        actor: { select: { id: true, name: true, email: true, role: true } },
        operation: { select: { id: true, reference: true, type: true, status: true, partner: true } },
      },
    });

    const total = await prisma.stockLedger.count({ where });
    res.status(200).json({ success: true, data: entries, meta: { total, limit, offset, hasMore: offset + entries.length < total } });
  } catch (error) {
    next(error);
  }
};
