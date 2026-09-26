import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import {
  listReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  addLine,
  updateLine,
  deleteLine,
  setAllDone,
  validateReceipt,
} from '../controllers/receipt.controller';

const router = Router();

router.get('/', listReceipts);
router.post('/', createReceipt);
router.get('/:id', getReceipt);
router.put('/:id', updateReceipt);
router.post('/:id/set-all-done', setAllDone);

router.post('/:id/lines', addLine);
router.put('/:id/lines/:lineId', updateLine);
router.delete('/:id/lines/:lineId', deleteLine);

// Validate: INVENTORY_MANAGER or ADMIN only (fixes missing role check defect)
router.post('/:id/validate', requireRole('INVENTORY_MANAGER', 'ADMIN'), validateReceipt);

export default router;
