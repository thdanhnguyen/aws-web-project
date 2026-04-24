import { Router } from "express";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller";
import { authenticateToken, validateIdParam, requireBody } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Tất cả route sản phẩm đều yêu cầu đăng nhập
router.use(authenticateToken);

// [LEARN] asyncHandler bọc controller để lỗi reject/throw được chuyển tới globalErrorHandler
router.get('/', asyncHandler(getProducts));
router.post('/', requireBody, asyncHandler(createProduct));
router.put('/:id', validateIdParam, requireBody, asyncHandler(updateProduct));
router.delete('/:id', validateIdParam, asyncHandler(deleteProduct));

export default router;