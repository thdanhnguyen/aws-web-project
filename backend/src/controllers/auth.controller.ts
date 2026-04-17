import { Request, Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_2026';

export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { tenant_id, tenant_name, email, password } = req.body;

    await client.query('BEGIN');

    const tenantCheck = await client.query('SELECT id FROM tenants WHERE id = $1', [tenant_id]);
    if (tenantCheck.rowCount !== 0) {
      return res.status(400).json({ error: 'Mã Shop này đã tồn tại, vui lòng chọn mã khác!' });
    }

    await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenant_id, tenant_name]);

    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = await client.query(
      'INSERT INTO users (tenant_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
      [tenant_id, email, passwordHash]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Đăng ký Shop thành công!',
      data: { tenant_id, user: userRes.rows[0] }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Lỗi Đăng ký:", error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký Shop' });
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng!' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng!' });
    }

    const token = jwt.sign(
      { user_id: user.id, tenant_id: user.tenant_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, tenant_id: user.tenant_id }
    });

  } catch (error) {
    console.error("Lỗi Đăng nhập:", error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập' });
  }
};
