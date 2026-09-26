import { Router } from 'express';
import {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
} from '../controllers/location.controller';

const router = Router();

router.get('/', listLocations);
router.get('/:id', getLocationById);
router.post('/', createLocation);
router.put('/:id', updateLocation);

export default router;
