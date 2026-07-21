import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant_id = (req as any).user.tenant_id;
    
    const revenueQuery = `
      SELECT 
        SUM(total_amount) as total_revenue,
        COUNT(id) as total_orders
      FROM invoices 
      WHERE tenant_id = $1 AND payment_status = 'Paid'
    `;
    const { rows: revenueRows } = await pool.query(revenueQuery, [tenant_id]);
    
    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as daily_revenue
      FROM invoices
      WHERE tenant_id = $1 AND payment_status = 'Paid'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 7
    `;
    const { rows: dailyRows } = await pool.query(dailyQuery, [tenant_id]);

    const stats = {
      totalRevenue: parseFloat(revenueRows[0].total_revenue) || 0,
      totalOrders: parseInt(revenueRows[0].total_orders) || 0,
      dailyRevenue: dailyRows
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
};
