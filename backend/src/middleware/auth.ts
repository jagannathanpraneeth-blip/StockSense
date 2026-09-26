import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import prisma from '../db/client';

// Extend Express Session to include userId
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const ROLES = {
  ADMIN: 'ADMIN',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return next(new AppError('Unauthorized: Please log in to access this resource.', 401));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    if (!user) {
      req.session.destroy(() => {});
      return next(new AppError('Unauthorized: User no longer exists.', 401));
    }

    if (!user.isActive) {
      req.session.destroy(() => {});
      return next(new AppError('Forbidden: User account is deactivated.', 403));
    }

    const { passwordHash, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    next(new AppError('Authentication failed due to a server error.', 500));
  }
};

/**
 * Role-based authorization middleware.
 * Must be applied AFTER requireAuth.
 *
 * Permission matrix:
 *   - WAREHOUSE_STAFF: create/edit drafts, picking, packing
 *   - INVENTORY_MANAGER: all staff actions + validate deliveries, transfers, receipts
 *   - ADMIN: all actions including adjustments
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return next(
        new AppError(
          `Forbidden: This action requires one of the following roles: ${roles.join(', ')}.`,
          403
        )
      );
    }
    next();
  };
};
