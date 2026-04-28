import { Router } from "express";
import { createTransaction, getTransactionHistory, getTransactionStatus, sepayWebhook } from "../controllers/transaction.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post('/webhook/sepay', asyncHandler(sepayWebhook));
router.get('/:id/status', asyncHandler(getTransactionStatus));
router.use(authenticateToken);
router.post('/', asyncHandler(createTransaction));
router.get('/history', asyncHandler(getTransactionHistory));

export default router;
