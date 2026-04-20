import { Router } from "express";
import { createTransaction, getTransactionHistory, getTransactionStatus, sepayWebhook } from "../controllers/transaction.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post('/', createTransaction);
router.post('/webhook/sepay', sepayWebhook);
router.get('/:id/status', getTransactionStatus);

router.use(authenticateToken);


router.get('/history', getTransactionHistory);

export default router;
