import {Request, Response} from "express";
import { pool } from "../config/database";

export const getShops = async (req: Request, res: Response) =>{
    try {
        const result = await pool.query(
            `SELECT id, name, domain FROM tenants`
        );
        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        throw error;
    }   
};

export const getShopProducts = async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const result = await pool.query(
            // [NEW] Trả về stock và category để Public Store biết hàng còn hay hết, và hiển thị danh mục
            `SELECT p.id, p.name, pd.price, pd.description, pd.material, pd.origin, pd.stock, pd.category
             FROM products p
             JOIN product_details pd ON p.id = pd.product_id
             WHERE p.tenant_id = $1
             ORDER BY p.id ASC`,
            [tenantId]
        );
        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        throw error;
    }
};

