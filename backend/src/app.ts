import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/product.routes';
import transactionRoutes from './routes/transaction.routes';
import authRoutes from './routes/auth.routes';
import publicRoutes from './routes/public.routes';

const app: Application = express();

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));

app.use(express.json());
app.use(cookieParser()); 
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'POS API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);

export default app;
