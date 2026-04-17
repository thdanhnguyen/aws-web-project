import { Router } from "express";
import { createTransaction } from "../controllers/transaction.controller";
import { tenantMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(tenantMiddleware);

router.post('/', createTransaction);

export default router;
