import { Request, Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'SUPER_REFRESH_SECRET_2026';

/**
 * POST /api/auth/register
 * Dành riêng cho Nhân viên (Staff) tự gia nhập Shop bằng mã mời.
 * Việc tạo Shop mới được thực hiện bởi Super Admin qua endpoint /api/system/tenants.
 */
export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { tenant_id, email, password, access_code, full_name } = req.body;

    if (!tenant_id || !email || !password || !access_code) {
      throw AppError.badRequest('Vui lòng điền đầy đủ thông tin bắt buộc');
    }

    await client.query('BEGIN');

    // 1. Kiểm tra shop có tồn tại không
    const tenantRes = await client.query(
      'SELECT id, access_code FROM tenants WHERE id = $1',
      [tenant_id]
    );
    if (tenantRes.rowCount === 0) {
      throw AppError.notFound('Mã Shop không tồn tại. Vui lòng kiểm tra lại.');
    }

    // 2. Đối chiếu access_code (mã mời nhân viên)
    const tenant = tenantRes.rows[0];
    if (tenant.access_code !== access_code) {
      throw AppError.forbidden('Mã mời nhân viên không đúng. Vui lòng liên hệ chủ Shop!');
    }

    // 3. Kiểm tra email chưa bị đăng ký
    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rowCount !== 0) {
      throw AppError.conflict('Email này đã được đăng ký. Vui lòng dùng email khác.');
    }

    // 4. Tạo tài khoản nhân viên (role = staff luôn)
    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      'INSERT INTO users (tenant_id, email, password_hash, role, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, tenant_id, role, full_name',
      [tenant.id, email, passwordHash, 'staff', full_name || email.split('@')[0]]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: 'Gia nhập shop thành công! Bạn có thể đăng nhập ngay.',
      data: userRes.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Đăng nhập — trả về role trong JWT và response
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) throw AppError.unauthorized('Sai email hoặc mật khẩu');

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw AppError.unauthorized('Sai email hoặc mật khẩu');

    const accessToken = jwt.sign(
      { user_id: user.id, tenant_id: user.tenant_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }  // 2 giờ — tránh user bị đẫy ra ngoài giữa ca làm việc
    );

    const refreshToken = jwt.sign(
      { user_id: user.id, tenant_id: user.tenant_id, role: user.role },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',  // 'lax' hoạt động đúng trên localhost, 'strict' có thể block cookie
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      accessToken,
      user: { id: user.id, email: user.email, tenant_id: user.tenant_id, role: user.role, full_name: user.full_name }
    });
  } catch (error) {
    throw error;
  }
};

// Làm mới access token (giữ role trong JWT)
export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw AppError.unauthorized('Phiên làm việc hết hạn');

    const dbToken = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (dbToken.rowCount === 0) throw AppError.forbidden('Token không hợp lệ');

    jwt.verify(refreshToken, REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) throw AppError.forbidden('Token đã bị giả mạo hoặc hết hạn');

      const accessToken = jwt.sign(
        { user_id: decoded.user_id, tenant_id: decoded.tenant_id, role: decoded.role },
        JWT_SECRET,
        { expiresIn: '2h' }
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
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Đã đăng xuất an toàn' });
  } catch (error) {
    throw error;
  }
};

// [ADMIN ONLY] Tạo tài khoản nhân viên mới cho shop
export const createStaff = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { email, password, full_name } = req.body;
    const tenantId = req.tenant_id;

    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO users (tenant_id, email, password_hash, role, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, full_name',
      [tenantId, email, passwordHash, 'staff', full_name || email.split('@')[0]]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Tạo nhân viên thành công!', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// [ADMIN ONLY] Danh sách nhân viên của shop
export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE tenant_id = $1 ORDER BY id ASC',
      [req.tenant_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    throw error;
  }
};

// [ADMIN ONLY] Xóa nhân viên (không tự xóa mình)
export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (parseInt(String(id)) === req.user_id) {
      throw AppError.forbidden('Không thể xóa tài khoản đang đăng nhập');
    }
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND tenant_id = $2 AND role = $3 RETURNING id',
      [id, req.tenant_id, 'staff']
    );
    if (result.rowCount === 0) throw AppError.notFound('Nhân viên không tồn tại');
    res.json({ success: true, message: 'Đã xóa nhân viên' });
  } catch (error) {
    throw error;
  }
};
