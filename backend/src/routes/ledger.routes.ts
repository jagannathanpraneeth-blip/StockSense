import { Router } from 'express';
import { listLedgerEntries } from '../controllers/ledger.controller';

const router = Router();

router.get('/', listLedgerEntries);

export default router;
