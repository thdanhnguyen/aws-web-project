import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireAdmin, validateIdParam } from '../middlewares/auth.middleware';

const router = Router();

// Public auth routes
router.post('/register', asyncHandler(authController.register));
router.post('/login',    asyncHandler(authController.login));
router.post('/refresh',  asyncHandler(authController.refresh));
router.post('/logout',   asyncHandler(authController.logout));

// [ADMIN ONLY] Staff management
router.get('/staff',          authenticateToken, requireAdmin, asyncHandler(authController.getStaff));
router.post('/staff',         authenticateToken, requireAdmin, asyncHandler(authController.createStaff));
router.delete('/staff/:id',   authenticateToken, requireAdmin, validateIdParam, asyncHandler(authController.deleteStaff));

export default router;
