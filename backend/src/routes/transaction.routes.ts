import { Router } from "express";
import { createTransaction, getTransactionHistory, getTransactionStatus, sepayWebhook } from "../controllers/transaction.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// [PUBLIC] Webhook từ SePay và polling trạng thái: không cần auth
router.post('/webhook/sepay', asyncHandler(sepayWebhook));
router.get('/:id/status', asyncHandler(getTransactionStatus));
router.post('/', asyncHandler(createTransaction));

// [PROTECTED] Lịch sử giao dịch: chỉ chủ shop đăng nhập mới xem được
router.use(authenticateToken);
router.get('/history', asyncHandler(getTransactionHistory));

export default router;
