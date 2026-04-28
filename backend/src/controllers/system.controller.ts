import { Request, Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/asyncHandler';

const SYSTEM_JWT_SECRET = process.env.SYSTEM_JWT_SECRET || 'MEKIE_SYSTEM_JWT_2026';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@mekie.com';
const SUPER_ADMIN_PASS  = process.env.SUPER_ADMIN_PASS  || 'MekieSystem2026';


export const systemLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email !== SUPER_ADMIN_EMAIL || password !== SUPER_ADMIN_PASS) {
    throw AppError.unauthorized('Sai thông tin đăng nhập hệ thống');
  }

  const token = jwt.sign(
    { role: 'superadmin', email: SUPER_ADMIN_EMAIL },
    SYSTEM_JWT_SECRET,
    { expiresIn: '4h' }
  );

  res.json({ success: true, token, email: SUPER_ADMIN_EMAIL });
};


export const requireSuperAdmin = (req: any, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, SYSTEM_JWT_SECRET);
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    req.superAdmin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ' });
  }
};


export const listTenants = async (_req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT
      t.id,
      t.name,
      t.domain,
      t.created_at,
      COUNT(u.id)::int                                        AS user_count,
      COUNT(u.id) FILTER (WHERE u.role = 'admin')::int        AS admin_count,
      COUNT(u.id) FILTER (WHERE u.role = 'staff')::int        AS staff_count
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id
    GROUP BY t.id, t.name, t.domain, t.created_at
    ORDER BY t.created_at DESC
  `);
  res.json({ success: true, data: result.rows });
};


export const createTenant = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { tenant_id, tenant_name, email, password, full_name, access_code } = req.body;
    const emailDomain = email.split('@')[1];

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM tenants WHERE id = $1 OR domain = $2',
      [tenant_id, emailDomain]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw AppError.conflict('Mã shop hoặc domain email này đã tồn tại');
    }

    await client.query(
      'INSERT INTO tenants (id, name, domain, access_code) VALUES ($1, $2, $3, $4)',
      [tenant_id, tenant_name, emailDomain, access_code]
    );

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      'INSERT INTO users (tenant_id, email, password_hash, role, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, full_name',
      [tenant_id, email, passwordHash, 'admin', full_name || email.split('@')[0]]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Tạo shop thành công!',
      data: { tenant: { id: tenant_id, name: tenant_name }, admin: userRes.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM tenants WHERE id = $1 RETURNING id, name',
    [id]
  );

  if (result.rowCount === 0) {
    throw AppError.notFound('Shop không tồn tại');
  }

  res.json({ success: true, message: `Đã xóa shop "${result.rows[0].name}"` });
};
