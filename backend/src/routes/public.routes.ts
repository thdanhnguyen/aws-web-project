import { Router } from "express";
import { getShops, getShopProducts } from "../controllers/public.controller";

const router = Router();

router.get('/shops', getShops);
router.get('/shops/:tenantId/products', getShopProducts);

export default router;