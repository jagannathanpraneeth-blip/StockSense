import { Request, Response } from 'express';
import prisma from '../db/client';
export async function getHealth(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok', app: 'StockSense', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ status: 'unavailable', app: 'StockSense' });
  }
}
