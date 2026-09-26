import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { ConflictError, NotFoundError } from '../utils/errors';

const warehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required').max(100),
  code: z.string().min(1, 'Warehouse code is required').max(20).toUpperCase(),
  address: z.string().max(255).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function listWarehouses(req: Request, res: Response, next: NextFunction) {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { locations: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getWarehouseById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${id}' not found`);
    }

    return res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createWarehouse(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = warehouseSchema.parse(req.body);

    const existing = await prisma.warehouse.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      throw new ConflictError(`Warehouse code '${validated.code}' is already in use`, {
        code: [`Warehouse code '${validated.code}' already exists. Please choose a unique code.`],
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: validated.name.trim(),
        code: validated.code.trim(),
        address: validated.address?.trim() || null,
        isActive: validated.isActive,
      },
    });

    return res.status(201).json({
      success: true,
      data: warehouse,
      message: 'Warehouse created successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateWarehouse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validated = warehouseSchema.parse(req.body);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${id}' not found`);
    }

    // Check if code is taken by another warehouse
    const duplicate = await prisma.warehouse.findFirst({
      where: {
        code: validated.code,
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new ConflictError(`Warehouse code '${validated.code}' is already in use`, {
        code: [`Warehouse code '${validated.code}' already exists. Please choose a unique code.`],
      });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        code: validated.code.trim(),
        address: validated.address?.trim() || null,
        isActive: validated.isActive,
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Warehouse updated successfully',
    });
  } catch (error) {
    return next(error);
  }
}
