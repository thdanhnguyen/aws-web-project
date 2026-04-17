import { Router } from "express";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller";
import { tenantMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(tenantMiddleware);

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;