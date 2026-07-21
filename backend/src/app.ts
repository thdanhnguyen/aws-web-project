import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/product.routes';
import transactionRoutes from './routes/transaction.routes';
import authRoutes from './routes/auth.routes';
import publicRoutes from './routes/public.routes';
import shiftRoutes from './routes/shift.routes';
import systemRoutes from './routes/system.routes';
import customerRoutes from './routes/customer.routes';
import dashboardRoutes from './routes/dashboard.routes';
import {
  requestLogger,
  securityHeaders,
  payloadSizeGuard,
  authRateLimiter,
  notFoundHandler,
  globalErrorHandler,
} from './middlewares/app.middleware';

const app: Application = express();

app.use(securityHeaders);
app.use(requestLogger);
app.use(payloadSizeGuard);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'MEKIE POS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
