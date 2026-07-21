import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant_id = (req as any).user.tenant_id;
    const { rows } = await pool.query(
      'SELECT * FROM customers WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant_id = (req as any).user.tenant_id;
    const { name, email, phone } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Thiếu tên khách hàng' });
      return;
    }
    const { rows } = await pool.query(
      'INSERT INTO customers (tenant_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [tenant_id, name, email, phone]
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant_id = (req as any).user.tenant_id;
    const { id } = req.params;
    await pool.query('DELETE FROM customers WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
};
