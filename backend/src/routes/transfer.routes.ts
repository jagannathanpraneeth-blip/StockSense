import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import {
  listTransfers, getTransfer, createTransfer, updateTransfer,
  addLine, updateLine, deleteLine,
  validateTransfer, cancelTransfer,
} from '../controllers/transfer.controller';

const router = Router();

router.get('/', listTransfers);
router.post('/', createTransfer);
router.get('/:id', getTransfer);
router.put('/:id', updateTransfer);
router.post('/:id/lines', addLine);
router.put('/:id/lines/:lineId', updateLine);
router.delete('/:id/lines/:lineId', deleteLine);
router.post('/:id/cancel', cancelTransfer);

// Validate: INVENTORY_MANAGER or ADMIN only
router.post('/:id/validate', requireRole('INVENTORY_MANAGER', 'ADMIN'), validateTransfer);

export default router;
