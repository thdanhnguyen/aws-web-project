import { Response } from "express";
import { pool } from '../config/database';
import { AuthRequest } from "../middlewares/auth.middleware";

export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        const currentTenantId = req.tenant_id;

        const result = await pool.query(
            `SELECT p.id, p.name, pd.price, pd.description, pd.material, pd.origin 
             FROM products p
             JOIN product_details pd ON p.id = pd.product_id
             WHERE p.tenant_id = $1`, [currentTenantId]
        );
        return res.status(200).json({ success: true, data: result.rows });

    } catch (error) {
        console.error("Lỗi getProducts:", error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const currentTenantId = req.tenant_id;
        const { name, price, description, material, origin } = req.body;

        await client.query('BEGIN');

        const productRes = await client.query(
            'INSERT INTO products (tenant_id, name) VALUES ($1, $2) RETURNING id', [currentTenantId, name]
        );
        const productId = productRes.rows[0].id;

        const detailRes = await client.query(
            'INSERT INTO product_details (product_id, price, description, material, origin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [productId, price, description, material, origin]
        );

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Product created successfully',
            data: { id: productId, name, price, description }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to create product 3NF' });
    } finally {
        client.release();
    }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const currentTenantId = req.tenant_id;
        const { id } = req.params;
        const { name, price, description, material, origin } = req.body;

        await client.query('BEGIN');

        await client.query(
            'UPDATE products SET name = $1 WHERE id = $2 AND tenant_id = $3', [name, id, currentTenantId]
        );

        const result = await client.query(
            'UPDATE product_details SET price = $1, description = $2, material = $3, origin = $4 WHERE product_id = $5 RETURNING *',
            [price, description, material, origin, id]
        );

        await client.query('COMMIT');

        return res.status(200).json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update product' });
    } finally {
        client.release();
    }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
    try {
        const currentTenantId = req.tenant_id;
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING *', [id, currentTenantId]
        );
        if (result.rowCount == 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete product' });
    }
};