import { Router } from "express";
import { getShops, getShopProducts } from "../controllers/public.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// [PUBLIC] Không cần auth — đây là trang khám phá shops công khai
router.get('/shops', asyncHandler(getShops));
router.get('/shops/:tenantId/products', asyncHandler(getShopProducts));

export default router;