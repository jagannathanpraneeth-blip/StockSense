import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const field = e.path.join('.') || 'general';
      if (!details[field]) details[field] = [];
      details[field].push(e.message);
    });

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      details,
    });
  }

  const code = (err as any).code;
  if (code === 'P2002') return res.status(409).json({ success: false, message: 'This unique value already exists' });
  if (code === 'P2003' || code === 'P2025') return res.status(409).json({ success: false, message: 'Record is missing or changed. Refresh and retry.' });
  if (['P1008', 'P2028', 'P2034'].includes(code)) return res.status(409).json({ success: false, message: 'Another operation is updating inventory. Refresh and retry.' });
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
