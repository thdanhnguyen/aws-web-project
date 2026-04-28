import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/product.routes';
import transactionRoutes from './routes/transaction.routes';
import authRoutes from './routes/auth.routes';
import publicRoutes from './routes/public.routes';
import shiftRoutes from './routes/shift.routes';
import systemRoutes from './routes/system.routes';
import {
  requestLogger,
  securityHeaders,
  payloadSizeGuard,
  authRateLimiter,
  notFoundHandler,
  globalErrorHandler,
} from './middlewares/app.middleware';

const app: Application = express();

// ═══════════════════════════════════════════════
// TẦNG 1: Middleware toàn cục (chạy MỌI request)
// Thứ tự quan trọng: Security → Logger → Parser
// ═══════════════════════════════════════════════

// [LEARN] Bảo mật phải đứng đầu tiên, trước khi bất kỳ logic nào chạy
app.use(securityHeaders);

// [LEARN] Logger phải đứng sớm để ghi log ngay cả khi request bị từ chối ở middleware sau
app.use(requestLogger);

// Giới hạn payload TRƯỚC KHI parse body (tránh tốn RAM parse body quá lớn)
app.use(payloadSizeGuard);

app.use(cors({
  // [LEARN] Trong production, thay bằng domain thật và đọc từ env variable
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// [LEARN] express.json() parse body thành object. Giới hạn 1mb để bảo vệ bộ nhớ.
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ═══════════════════════════════════════════════
// TẦNG 2: Health Check (không cần auth)
// ═══════════════════════════════════════════════
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'MEKIE POS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════
// TẦNG 3: Routes ứng dụng
// ═══════════════════════════════════════════════

// [LEARN] authRateLimiter đặt trước auth routes để chặn brute force login/register
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/system', systemRoutes);

// ═══════════════════════════════════════════════
// TẦNG 4: Error Handling (PHẢI đứng cuối cùng)
// ═══════════════════════════════════════════════

// [LEARN] 404 phải đặt SAU tất cả route hợp lệ
// Nếu không có route nào khớp, request rơi xuống đây
app.use(notFoundHandler);

// [LEARN] Global Error Handler phải có đúng 4 tham số (err, req, res, next)
// Bắt mọi lỗi từ controller qua next(err) hoặc throw trong async handler
app.use(globalErrorHandler);

export default app;
