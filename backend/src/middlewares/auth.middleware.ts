import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_2026';

// [LEARN] Mở rộng interface Request của Express để thêm thông tin tenant vào mỗi request.
// Đây là kỹ thuật "Type Augmentation" — thêm field lên kiểu dữ liệu có sẵn.
export interface AuthRequest extends Request {
  tenant_id?: string;
  user_id?: number;
}

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 1: Xác thực JWT Token (Bắt buộc đăng nhập)
// Dùng cho tất cả các route cần bảo vệ (Warehouse, History, v.v.)
// ─────────────────────────────────────────────────────────────────
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // [LEARN] Chuẩn HTTP Authorization Header: "Bearer <token>"
  // Regex ngầm định của chuẩn này là: /^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/
  const authHeader = req.headers['authorization'];

  // Kiểm tra Header có tồn tại và đúng format "Bearer ..." không
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Truy cập bị từ chối',
      message: 'Thiếu Authorization header. Định dạng yêu cầu: Bearer <token>'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  // [EDGE CASE] Kiểm tra token không rỗng sau khi split
  if (!token || token.trim() === '') {
    res.status(401).json({
      success: false,
      error: 'Token không hợp lệ',
      message: 'Token không được để trống'
    });
    return;
  }

  // [LEARN] JWT gồm 3 phần cách nhau bằng dấu chấm: header.payload.signature
  // Kiểm tra sơ bộ cấu trúc trước khi verify để trả về lỗi rõ ràng hơn
  const jwtParts = token.split('.');
  if (jwtParts.length !== 3) {
    res.status(401).json({
      success: false,
      error: 'Token không đúng định dạng',
      message: 'JWT phải có 3 phần: header.payload.signature'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // [SECURITY] Kiểm tra payload của token có chứa đúng thông tin cần thiết không
    // Tránh trường hợp token hợp lệ nhưng payload bị thiếu field quan trọng
    if (!decoded.tenant_id || !decoded.user_id) {
      res.status(403).json({
        success: false,
        error: 'Token không hợp lệ',
        message: 'Payload token thiếu thông tin bắt buộc (tenant_id, user_id)'
      });
      return;
    }

    req.tenant_id = decoded.tenant_id;
    req.user_id   = decoded.user_id;

    next();
  } catch (error: any) {
    // [LEARN] Phân biệt 2 loại lỗi JWT phổ biến để client xử lý đúng cách:
    // - TokenExpiredError: Token hết hạn → Frontend gọi /refresh để lấy token mới
    // - JsonWebTokenError: Token bị giả mạo/sai chữ ký → Logout ngay
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token đã hết hạn',
        code: 'TOKEN_EXPIRED',
        message: 'Phiên làm việc hết hạn. Vui lòng làm mới token.'
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(403).json({
        success: false,
        error: 'Token không hợp lệ',
        code: 'TOKEN_INVALID',
        message: 'Chữ ký token không hợp lệ hoặc bị giả mạo.'
      });
    } else {
      res.status(403).json({
        success: false,
        error: 'Xác thực thất bại',
        code: 'AUTH_FAILED',
        message: 'Không thể xác thực token. Vui lòng đăng nhập lại.'
      });
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 2: Validate ID Param (Kiểm tra :id trên URL)
// Dùng cho các route kiểu PUT /products/:id, GET /transactions/:id
// ─────────────────────────────────────────────────────────────────
export const validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
  // [LEARN] Ép kiểu về string vì TypeScript khai báo req.params là { [key: string]: string }
  // nhưng để an toàn nên dùng String() để tránh lỗi edge case
  const id = String(req.params.id);

  // [LEARN] Regex /^\d+$/ — kiểm tra chuỗi chỉ chứa chữ số, ngăn Path Traversal Attack
  if (!id || !/^\d+$/.test(id)) {
    res.status(400).json({
      success: false,
      error: 'ID không hợp lệ',
      message: 'Tham số :id phải là số nguyên dương. Nhận được: ' + id
    });
    return;
  }

  next();
};


// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 3: Validate JSON Body (Kiểm tra request body không rỗng)
// Dùng cho các route POST/PUT yêu cầu body
// ─────────────────────────────────────────────────────────────────
export const requireBody = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({
      success: false,
      error: 'Request body rỗng',
      message: 'Yêu cầu phải gửi kèm JSON body với Content-Type: application/json'
    });
    return;
  }
  next();
};
