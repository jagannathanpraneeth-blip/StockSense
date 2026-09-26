import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import {
  listAdjustments, getAdjustment, createAdjustment,
  validateAdjustment, cancelAdjustment,
} from '../controllers/adjustment.controller';

const router = Router();

router.get('/', listAdjustments);
router.post('/', createAdjustment);
router.get('/:id', getAdjustment);
router.post('/:id/cancel', cancelAdjustment);

// Validate: INVENTORY_MANAGER or ADMIN only
router.post('/:id/validate', requireRole('INVENTORY_MANAGER', 'ADMIN'), validateAdjustment);

export default router;
