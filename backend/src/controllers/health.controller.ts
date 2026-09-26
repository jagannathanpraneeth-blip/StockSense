import { Request, Response } from 'express';

export async function getHealth(req: Request, res: Response) {
  return res.status(200).json({
    status: 'ok',
    app: 'StockSense',
    stage: 'Stage 1',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
