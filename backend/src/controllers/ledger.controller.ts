import { Request, Response, NextFunction } from 'express';
import prisma from '../db/client';

export const listLedgerEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, locationId, referenceType, search } = req.query;

    const where: any = {};

    if (productId && typeof productId === 'string') {
      where.productId = productId;
    }
    if (locationId && typeof locationId === 'string') {
      where.locationId = locationId;
    }
    if (referenceType && typeof referenceType === 'string') {
      where.referenceType = referenceType;
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { referenceDoc: { contains: q } },
        { product: { name: { contains: q } } },
        { product: { sku: { contains: q } } },
        { location: { name: { contains: q } } },
        { location: { code: { contains: q } } },
      ];
    }

    const entries = await prisma.stockLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
        actor: { select: { id: true, name: true, email: true, role: true } },
        operation: { select: { id: true, reference: true, type: true, status: true, partner: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};
