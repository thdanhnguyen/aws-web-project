import { Router } from 'express';
import { openShift, closeShift, getCurrentShift, getAllShifts } from '../controllers/shift.controller';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticateToken);

router.get('/current', asyncHandler(getCurrentShift as any));
router.post('/open',   asyncHandler(openShift as any));
router.post('/close',  asyncHandler(closeShift as any));
router.get('/',        requireAdmin, asyncHandler(getAllShifts as any));

export default router;
