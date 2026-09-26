import { Router } from 'express';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
} from '../controllers/product.controller';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);

export default router;
