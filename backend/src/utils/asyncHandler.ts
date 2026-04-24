import { Request, Response, NextFunction, RequestHandler } from 'express';

// ─────────────────────────────────────────────────────────────────
// asyncHandler — Wrapper cho async route handler
// ─────────────────────────────────────────────────────────────────
// [LEARN] Vấn đề: Express 4 KHÔNG tự động bắt lỗi từ async function.
// Nếu một async controller throw lỗi hoặc Promise bị reject,
// Express sẽ không gọi globalErrorHandler mà để lỗi "treo" không xử lý.
//
// Giải pháp: Wrap mọi async controller trong asyncHandler.
// Hàm này gọi fn(), nếu Promise bị reject → chuyển lỗi sang next(err)
// → globalErrorHandler trong app.ts sẽ bắt và xử lý.
//
// TRƯỚC (bị "nuốt" lỗi):
//   router.get('/', async (req, res) => { throw new Error(); }); // ❌ lỗi bị mất
//
// SAU (lỗi đến globalErrorHandler):
//   router.get('/', asyncHandler(async (req, res) => { throw new Error(); })); // ✅

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Promise.resolve bọc fn() để đảm bảo cả sync throw và async reject đều được bắt
    Promise.resolve(fn(req, res, next)).catch(next); // next = next(err) → globalErrorHandler
  };
};

// ─────────────────────────────────────────────────────────────────
// AppError — Custom Error class cho lỗi có chủ đích (Operational Error)
// ─────────────────────────────────────────────────────────────────
// [LEARN] Phân biệt 2 loại lỗi trong backend:
// 1. Operational Error: Lỗi có thể đoán trước (sai input, không tìm thấy) — dùng AppError
// 2. Programming Error: Bug thật sự (null pointer, sai logic) — để globalErrorHandler xử lý

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode  = statusCode;
    // [LEARN] Cần gọi Object.setPrototypeOf khi extend Error trong TypeScript
    // để instanceof AppError hoạt động đúng
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // Factory methods tiện lợi cho các lỗi phổ biến
  static badRequest(message: string)  { return new AppError(message, 400); }
  static unauthorized(message: string){ return new AppError(message, 401); }
  static forbidden(message: string)   { return new AppError(message, 403); }
  static notFound(message: string)    { return new AppError(message, 404); }
  static conflict(message: string)    { return new AppError(message, 409); }
}
