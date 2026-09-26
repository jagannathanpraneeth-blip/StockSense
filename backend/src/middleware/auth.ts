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
      user?: any; // We'll type this better if needed, but 'any' is okay for now or use Prisma User type without passwordHash
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return next(new AppError('Unauthorized: Please log in to access this resource.', 401));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    if (!user) {
      // Session has a user ID, but user no longer exists in DB
      req.session.destroy(() => {});
      return next(new AppError('Unauthorized: User no longer exists.', 401));
    }

    if (!user.isActive) {
      req.session.destroy(() => {});
      return next(new AppError('Forbidden: User account is deactivated.', 403));
    }

    // Attach user to request (excluding password hash)
    const { passwordHash, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    next(new AppError('Authentication failed due to a server error.', 500));
  }
};
