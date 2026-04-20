import {Request, Response} from "express";
import { pool } from "../config/database";

export const getShops = async (req: Request, res: Response) =>{
    try {
        const result = await pool.query(
            `SELECT id, name, domain FROM tenants`
        );
        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching shops:", error);
        return res.status(500).json({ error: 'Failed to fetch shops' });
    }   
};

export const getShopProducts = async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const result = await pool.query(
            `SELECT p.id, p.name, pd.price, pd.description, pd.material, pd.origin 
             FROM products p
             JOIN product_details pd ON p.id = pd.product_id
             WHERE p.tenant_id = $1`,
            [tenantId]
        );
        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
};

