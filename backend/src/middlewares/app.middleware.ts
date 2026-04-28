import { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 1: Request Logger
// Ghi log mọi request vào — giúp debug và audit trail
// ─────────────────────────────────────────────────────────────────

// [LEARN] Dùng ANSI escape code để tô màu log trong terminal
// Giúp phân biệt nhanh GET (xanh), POST (vàng), lỗi 4xx/5xx (đỏ)
const METHOD_COLORS: Record<string, string> = {
  GET:    '\x1b[36m',  // Cyan
  POST:   '\x1b[33m',  // Yellow
  PUT:    '\x1b[34m',  // Blue
  DELETE: '\x1b[31m',  // Red
  PATCH:  '\x1b[35m',  // Magenta
};
const RESET = '\x1b[0m';
const DIM   = '\x1b[2m';
const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const methodColor = METHOD_COLORS[req.method] || RESET;

  // [LEARN] res.on('finish') được gọi SAU KHI response đã gửi xong về client
  // Đây là kỹ thuật "tap" vào response lifecycle để đo thời gian xử lý
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? RED
      : res.statusCode >= 400 ? '\x1b[33m'  // Orange-ish
      : GREEN;

    console.log(
      `${DIM}[${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}]${RESET} ` +
      `${methodColor}${BOLD}${req.method.padEnd(6)}${RESET} ` +
      `${req.originalUrl.padEnd(40)} ` +
      `${statusColor}${res.statusCode}${RESET} ` +
      `${DIM}${duration}ms${RESET}`
    );
  });

  next();
};

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 2: Payload Size Guard
// Từ chối request có body quá lớn trước khi xử lý
// ─────────────────────────────────────────────────────────────────
export const payloadSizeGuard = (req: Request, res: Response, next: NextFunction): void => {
  // [LEARN] Content-Length header có thể không tồn tại với chunked transfer
  // nhưng kiểm tra nó là lớp bảo vệ đầu tiên trước khi body được parse hoàn toàn
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

  if (contentLength > MAX_SIZE_BYTES) {
    res.status(413).json({
      success: false,
      error: 'Payload quá lớn',
      message: `Request body vượt quá giới hạn ${MAX_SIZE_BYTES / 1024}KB`
    });
    return;
  }
  next();
};

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 3: Security Headers
// Thêm các HTTP header bảo mật mà không cần cài Helmet
// ─────────────────────────────────────────────────────────────────
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // [LEARN] Giải thích từng security header:

  // Ngăn browser tự đoán kiểu content (MIME type sniffing attack)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Ngăn trang bị nhúng vào iframe của trang khác (Clickjacking attack)
  res.setHeader('X-Frame-Options', 'DENY');

  // Bật XSS filter tích hợp của browser cũ (IE, Chrome < 78)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Không gửi Referer header khi chuyển từ HTTPS sang HTTP
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // [LEARN] Xóa header "X-Powered-By: Express" để không lộ tech stack cho attacker
  res.removeHeader('X-Powered-By');

  next();
};

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 4: Rate Limiter đơn giản (In-memory)
// Giới hạn số request mỗi IP trong khoảng thời gian nhất định
// Áp dụng cho auth routes để chống brute force password
// ─────────────────────────────────────────────────────────────────

// [LEARN] Map lưu trạng thái rate limit theo IP. Trong production thực tế,
// nên dùng Redis để chia sẻ state giữa nhiều server instance.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS   = 15 * 60 * 1000; // 15 phút
const MAX_REQUESTS = 100;            // Tối đa 100 request/15 phút/IP

export const authRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  // [LEARN] Lấy IP thật của client. X-Forwarded-For có khi đứng sau proxy/nginx.
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
    || req.socket.remoteAddress
    || 'unknown';

  const now = Date.now();
  const record = rateLimitStore.get(ip);

  // Nếu chưa có record hoặc đã qua window time thì reset
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  // Tăng số lần request
  record.count++;

  if (record.count > MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);

    // [LEARN] Header Retry-After là chuẩn HTTP — client biết khi nào được thử lại
    res.setHeader('Retry-After', retryAfterSec);
    res.status(429).json({
      success: false,
      error: 'Quá nhiều yêu cầu',
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Vượt quá ${MAX_REQUESTS} request trong 15 phút. Thử lại sau ${retryAfterSec} giây.`
    });
    return;
  }

  next();
};

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 5: 404 Not Found Handler
// Bắt tất cả các route không tồn tại — PHẢI đặt sau tất cả route
// ─────────────────────────────────────────────────────────────────
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Không tìm thấy endpoint',
    message: `Route ${req.method} ${req.originalUrl} không tồn tại`,
    hint: 'Kiểm tra lại method (GET/POST/PUT/DELETE) và đường dẫn URL'
  });
};

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE 6: Global Error Handler
// Bắt TẤT CẢ lỗi chưa được xử lý từ toàn bộ ứng dụng
// PHẢI có đúng 4 tham số (error, req, res, next) để Express nhận ra là error handler
// ─────────────────────────────────────────────────────────────────
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction  // [LEARN] Phải khai báo _next dù không dùng — Express yêu cầu đủ 4 tham số
): void => {
  // Log lỗi đầy đủ ra server (dev có thể xem), nhưng KHÔNG trả stack về client
  console.error(`\x1b[31m[ERROR]\x1b[0m ${req.method} ${req.originalUrl}`);
  console.error(err);

  // [LEARN] Phân biệt lỗi có chủ đích (operational) vs lỗi bất ngờ (programming error)
  // Lỗi từ controller throw ra với statusCode tùy chỉnh
  if (err.statusCode && err.statusCode < 500) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message || 'Lỗi request',
    });
    return;
  }

  // Lỗi DB: duplicate key (ví dụ: email đã tồn tại)
  if (err.code === '23505') {
    res.status(409).json({
      success: false,
      error: 'Dữ liệu đã tồn tại',
      message: 'Giá trị bạn nhập đã có trong hệ thống (duplicate key)'
    });
    return;
  }

  // Lỗi DB: vi phạm foreign key (ví dụ: xóa tenant đang có user)
  if (err.code === '23503') {
    res.status(409).json({
      success: false,
      error: 'Ràng buộc dữ liệu',
      message: 'Không thể thực hiện vì dữ liệu đang được tham chiếu'
    });
    return;
  }

  // Lỗi JSON parse (client gửi body không phải JSON hợp lệ)
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: 'JSON không hợp lệ',
      message: 'Request body không phải JSON hợp lệ. Kiểm tra lại cú pháp.'
    });
    return;
  }

  // Mọi lỗi khác — che đi chi tiết để tránh lộ thông tin nội bộ
  res.status(500).json({
    success: false,
    error: 'Lỗi máy chủ nội bộ',
    message: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.'
  });
};
