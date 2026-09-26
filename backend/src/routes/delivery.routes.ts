import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import {
  listDeliveries, getDelivery, createDelivery, updateDelivery,
  addLine, updateLine, deleteLine,
  startPicking, markReady, validateDelivery, cancelDelivery,
} from '../controllers/delivery.controller';

const router = Router();

// Read + Draft operations: any authenticated user
router.get('/', listDeliveries);
router.post('/', createDelivery);
router.get('/:id', getDelivery);
router.put('/:id', updateDelivery);
router.post('/:id/lines', addLine);
router.put('/:id/lines/:lineId', updateLine);
router.delete('/:id/lines/:lineId', deleteLine);

// Workflow transitions: staff can pick/pack; cancel is open
router.post('/:id/start-picking', startPicking);
router.post('/:id/mark-ready', markReady);
router.post('/:id/cancel', cancelDelivery);

// Validate (stock deduction): INVENTORY_MANAGER or ADMIN only
router.post('/:id/validate', requireRole('INVENTORY_MANAGER', 'ADMIN'), validateDelivery);

export default router;
