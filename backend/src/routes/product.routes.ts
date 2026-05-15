import { Router } from "express";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller";
import { authenticateToken, requireAdmin, validateIdParam, requireBody } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Tất cả route sản phẩm đều yêu cầu đăng nhập
router.use(authenticateToken);

// GET: Cả admin lẫn staff đều có thể xem danh sách sản phẩm
router.get('/', asyncHandler(getProducts));

// POST/PUT/DELETE: Chỉ Admin mới được thêm, sửa, xóa sản phẩm
router.post('/', requireAdmin, requireBody, asyncHandler(createProduct));
router.put('/:id', requireAdmin, validateIdParam, requireBody, asyncHandler(updateProduct));
router.delete('/:id', requireAdmin, validateIdParam, asyncHandler(deleteProduct));

export default router;