import { Router } from 'express';
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
router.post('/:id/validate', validateReceipt);
router.post('/:id/set-all-done', setAllDone);

router.post('/:id/lines', addLine);
router.put('/:id/lines/:lineId', updateLine);
router.delete('/:id/lines/:lineId', deleteLine);

export default router;
