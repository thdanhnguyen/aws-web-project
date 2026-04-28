import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AppError } from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/auth.middleware';

export const openShift = async (req: AuthRequest, res: Response) => {
  const { opening_cash } = req.body;
  const userId = req.user_id!;
  const tenantId = req.tenant_id!;

  const existing = await pool.query(
    "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'",
    [userId]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw AppError.badRequest('Bạn đang có một ca làm việc đang mở. Vui lòng đóng ca trước.');
  }

  const result = await pool.query(
    'INSERT INTO shifts (tenant_id, user_id, opening_cash) VALUES ($1, $2, $3) RETURNING *',
    [tenantId, userId, opening_cash || 0]
  );

  res.status(201).json({ success: true, message: 'Mở ca thành công!', data: result.rows[0] });
};

export const closeShift = async (req: AuthRequest, res: Response) => {
  const userId = req.user_id!;
  const tenantId = req.tenant_id!;

  const shiftRes = await pool.query(
    "SELECT id, opened_at FROM shifts WHERE user_id = $1 AND tenant_id = $2 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
    [userId, tenantId]
  );

  if (shiftRes.rowCount === 0) throw AppError.notFound('Không tìm thấy ca đang mở');

  const shiftId = shiftRes.rows[0].id;
  const openedAt = shiftRes.rows[0].opened_at;

  const salesRes = await pool.query(
    `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_sales
     FROM invoices
     WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, openedAt]
  );

  const { total_orders, total_sales } = salesRes.rows[0];

  const result = await pool.query(
    `UPDATE shifts 
     SET status = 'closed', closed_at = NOW(), total_orders = $1, total_sales = $2
     WHERE id = $3
     RETURNING *`,
    [parseInt(total_orders), parseFloat(total_sales), shiftId]
  );

  res.json({ success: true, message: 'Đóng ca thành công!', data: result.rows[0] });
};

export const getCurrentShift = async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT s.*, u.full_name, u.email
     FROM shifts s
     JOIN users u ON s.user_id = u.id
     WHERE s.user_id = $1 AND s.tenant_id = $2 AND s.status = 'open'
     ORDER BY s.opened_at DESC LIMIT 1`,
    [req.user_id, req.tenant_id]
  );
  res.json({ success: true, data: result.rows[0] || null });
};

// [ADMIN ONLY] Xem tất cả ca của shop
export const getAllShifts = async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT s.*, u.full_name, u.email
     FROM shifts s
     JOIN users u ON s.user_id = u.id
     WHERE s.tenant_id = $1
     ORDER BY s.opened_at DESC LIMIT 50`,
    [req.tenant_id]
  );
  res.json({ success: true, data: result.rows });
};
