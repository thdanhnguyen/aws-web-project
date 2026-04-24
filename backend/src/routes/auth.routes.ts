import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// [LEARN] authRateLimiter đã được áp dụng ở tầng app.ts cho TOÀN BỘ /api/auth
// Ở đây chỉ cần wrap asyncHandler để lỗi DB (duplicate email, v.v.) đến globalErrorHandler
router.post('/register', asyncHandler(authController.register));
router.post('/login',    asyncHandler(authController.login));
router.post('/refresh',  asyncHandler(authController.refresh));
router.post('/logout',   asyncHandler(authController.logout));

export default router;
