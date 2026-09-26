import { Prisma } from '@prisma/client';
import prisma from '../db/client';
import { AppError } from '../utils/errors';

type Client = Prisma.TransactionClient;
export async function checkOperationInput(body: any, db: Client = prisma): Promise<void> {
  if (body.lines !== undefined && !Array.isArray(body.lines)) throw new AppError('Lines must be an array', 422);
  if (body.expectedDate && !(body.expectedDate instanceof Date) && (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(body.expectedDate) || !Number.isFinite(Date.parse(body.expectedDate)))) {
    throw new AppError('Enter a valid scheduled date', 422);
  }
  const locations = [...new Set([body.sourceLocationId, body.destLocationId, body.locationId].filter(Boolean))] as string[];
  for (const id of locations) {
    if (typeof id !== 'string') throw new AppError('Invalid location identifier', 422);
    const location = await db.location.findUnique({ where: { id }, include: { warehouse: true } });
    if (!location || !location.isActive || !location.warehouse.isActive) throw new AppError('Select an active location in an active warehouse', 422);
  }
  const products = [...new Set([body.productId, ...(body.lines || []).map((l: any) => l?.productId)].filter(Boolean))] as string[];
  if (products.some(id => typeof id !== 'string')) throw new AppError('Invalid product identifier', 422);
  if (products.length && await db.product.count({ where: { id: { in: products }, isActive: true } }) !== products.length) {
    throw new AppError('Select active products for every line', 422);
  }
}
