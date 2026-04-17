import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';
import transactionRoutes from './routes/transaction.routes';
import authRoutes from './routes/auth.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());

// [LEARN] Các Routes công khai (không cần login)
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'POS API is running' });
});

app.use('/api/auth', authRoutes);

// [LEARN] Các Routes bảo mật (Phải login mới dùng được)
// Lưu ý: Middleware bảo vệ sẽ được khai báo chi tiết trong từng Router
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);

export default app;
