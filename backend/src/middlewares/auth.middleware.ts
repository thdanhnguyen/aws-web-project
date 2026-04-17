import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_2026';

export interface AuthRequest extends Request {
  tenant_id?: string;
  user_id?: number;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Truy cập bị từ chối. Vui lòng đăng nhập!' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    req.tenant_id = decoded.tenant_id;
    req.user_id = decoded.user_id;
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
};
