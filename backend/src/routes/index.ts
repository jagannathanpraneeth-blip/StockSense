import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import warehouseRoutes from './warehouse.routes';
import locationRoutes from './location.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import receiptRoutes from './receipt.routes';
import ledgerRoutes from './ledger.routes';

const router = Router();

// Public routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected business routes
router.use('/warehouses', requireAuth, warehouseRoutes);
router.use('/locations', requireAuth, locationRoutes);
router.use('/categories', requireAuth, categoryRoutes);
router.use('/products', requireAuth, productRoutes);
router.use('/receipts', requireAuth, receiptRoutes);
router.use('/ledger', requireAuth, ledgerRoutes);

export default router;
