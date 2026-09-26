import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { ConflictError, NotFoundError } from '../utils/errors';

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100),
  code: z.string().min(1, 'Location code is required').max(30).toUpperCase(),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  isScrap: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export async function listLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const { warehouseId } = req.query;

    const locations = await prisma.location.findMany({
      where: warehouseId ? { warehouseId: String(warehouseId) } : undefined,
      orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { stockBalances: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getLocationById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        warehouse: true,
        stockBalances: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundError(`Location with ID '${id}' not found`);
    }

    return res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = locationSchema.parse(req.body);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: validated.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${validated.warehouseId}' does not exist`);
    }

    const existingCode = await prisma.location.findUnique({
      where: { code: validated.code },
    });

    if (existingCode) {
      throw new ConflictError(`Location code '${validated.code}' is already in use`, {
        code: [`Location code '${validated.code}' already exists. Please choose a unique code.`],
      });
    }

    const location = await prisma.location.create({
      data: {
        name: validated.name.trim(),
        code: validated.code.trim(),
        warehouseId: validated.warehouseId,
        isScrap: validated.isScrap,
        isActive: validated.isActive,
      },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: location,
      message: 'Location created successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validated = locationSchema.parse(req.body);

    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundError(`Location with ID '${id}' not found`);
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: validated.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID '${validated.warehouseId}' does not exist`);
    }

    const duplicate = await prisma.location.findFirst({
      where: {
        code: validated.code,
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new ConflictError(`Location code '${validated.code}' is already in use`, {
        code: [`Location code '${validated.code}' already exists. Please choose a unique code.`],
      });
    }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        code: validated.code.trim(),
        warehouseId: validated.warehouseId,
        isScrap: validated.isScrap,
        isActive: validated.isActive,
      },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Location updated successfully',
    });
  } catch (error) {
    return next(error);
  }
}
