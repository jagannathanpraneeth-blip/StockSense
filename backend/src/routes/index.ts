import { Router } from 'express';
import healthRoutes from './health.routes';
import warehouseRoutes from './warehouse.routes';
import locationRoutes from './location.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/locations', locationRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

export default router;
