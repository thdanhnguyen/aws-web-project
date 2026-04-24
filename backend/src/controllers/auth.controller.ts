import { Request, Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { AppError } from '../utils/asyncHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'SUPER_REFRESH_SECRET_2026';

export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { tenant_id, tenant_name, email, password, access_code } = req.body;
    
    const emailDomain = email.split('@')[1];

    await client.query('BEGIN');

    const tenantCheck = await client.query('SELECT * FROM tenants WHERE domain = $1', [emailDomain]);

    let finalTenantId = tenant_id;

    if (tenantCheck.rowCount !== 0) {
      const existingTenant = tenantCheck.rows[0];
      if (existingTenant.access_code !== access_code) {
        throw AppError.forbidden('Mã bảo mật không đúng. Vui lòng liên hệ chủ Shop!');
      }
      finalTenantId = existingTenant.id;
    } else {
      await client.query(
        'INSERT INTO tenants (id, name, domain, access_code) VALUES ($1, $2, $3, $4)', 
        [tenant_id, tenant_name, emailDomain, access_code]
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      'INSERT INTO users (tenant_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, tenant_id',
      [finalTenantId, email, passwordHash]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Đăng ký thành công!', data: userRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) throw AppError.unauthorized('Sai email hoặc mật khẩu');

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw AppError.unauthorized('Sai email hoặc mật khẩu');

    // 1. Tạo Access Token (Ngắn: 10 phút như sếp yêu cầu)
    const accessToken = jwt.sign(
      { user_id: user.id, tenant_id: user.tenant_id },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    // 2. Tạo Refresh Token (Dài: 7 ngày)
    const refreshToken = jwt.sign(
      { user_id: user.id, tenant_id: user.tenant_id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 3. Lưu Refresh Token vào Database để quản lý (Revoke được khi cần)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    // 4. Gửi Refresh Token qua HttpOnly Cookie (An toàn tuyệt đối)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Để false nếu sếp chạy localhost (không có https)
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    });

    // 5. Trả về Access Token trong JSON (Lưu vào bộ nhớ Frontend)
    res.json({
      success: true,
      accessToken,
      user: { id: user.id, email: user.email, tenant_id: user.tenant_id }
    });
  } catch (error) {
    throw error;
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    // 1. Lấy Refresh Token từ Cookie
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw AppError.unauthorized('Phiên làm việc hết hạn');

    // 2. Kiểm tra Token có trong Database không
    const dbToken = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (dbToken.rowCount === 0) throw AppError.forbidden('Token không hợp lệ');

    // 3. Xác thực JWT Refresh Token
    jwt.verify(refreshToken, REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) throw AppError.forbidden('Token đã bị giả mạo hoặc hết hạn');

      // 4. Cấp Access Token mới (10 phút)
      const accessToken = jwt.sign(
        { user_id: decoded.user_id, tenant_id: decoded.tenant_id },
        JWT_SECRET,
        { expiresIn: '10m' }
      );

      res.json({ success: true, accessToken });
    });
  } catch (error) {
    throw error;
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    // Xóa trong Database
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    // Xóa Cookie
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Đã đăng xuất an toàn' });
  } catch (error) {
    throw error;
  }
};
