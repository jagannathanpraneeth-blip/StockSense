import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { ConflictError } from '../utils/errors';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().max(255).optional().nullable(),
});

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = categorySchema.parse(req.body);

    const existing = await prisma.category.findFirst({
      where: {
        name: {
          equals: validated.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Category '${validated.name}' already exists`, {
        name: [`Category '${validated.name}' already exists.`],
      });
    }

    const category = await prisma.category.create({
      data: {
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    return next(error);
  }
}
