import { Request, Response, NextFunction } from 'express';

// Extend Express Request object to include tenant_id
declare global {
  namespace Express {
    interface Request {
      tenant_id?: string;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return res.status(401).json({ error: 'Tenant ID is missing in headers (Multi-tenant requirement)' });
  }

  req.tenant_id = tenantId;
  next();
};
