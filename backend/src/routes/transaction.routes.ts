import { Router } from "express";
import { createTransaction, getTransactionHistory } from "../controllers/transaction.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post('/', createTransaction);

router.use(authenticateToken);


router.get('/history', getTransactionHistory);

export default router;
