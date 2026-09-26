import { Router } from 'express';
import {
  listWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
} from '../controllers/warehouse.controller';

const router = Router();

router.get('/', listWarehouses);
router.get('/:id', getWarehouseById);
router.post('/', createWarehouse);
router.put('/:id', updateWarehouse);

export default router;
