import { Request, Response } from "express";
import { pool } from '../config/database';

export const getProducts = async (req: Request, res: Response) => {
    try {
    const currentTenantId = req.tenant_id;

    const result = await pool.query(
        'SELECT * FROM products WHERE tenant_id = $1', [currentTenantId]
    );
    return res.status(200).json({success: true, data: result.rows});

    } catch (error) {
        return res.status(500).json({error: 'Failed to fetch products'});
    }
};

export const createProduct = async (req: Request, res: Response) =>{
    try{
        const currentTenantId = req.tenant_id;
        const {name, price} = req.body;
        const result = await pool.query(
            'INSERT INTO products (tenant_id, name, price) VALUES ($1, $2, $3) RETURNING *', [currentTenantId, name, price]
        );
        res.status(200).json({success: true, message: 'Product created successfully', data: result.rows[0]});
    } catch (error) {
        return res.status(500).json({error: 'Failed to create product'});
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try{
        const currentTenantId = req.tenant_id;
        const {id} = req.params;
        const {name, price} = req.body;
        const result = await pool.query(
            'UPDATE products SET name = $1, price = $2 WHERE id = $3 AND tenant_id = $4 RETURNING *', [name, price,id,currentTenantId]
        );
        if(result.rowCount == 0 ){
            return res.status(404).json({error: 'Product not found'});
        }
        return res.status(200).json({success: true, message: 'Product updated successfully', data: result.rows[0]});
    } catch (error) {
        return res.status(500).json({error: 'Failed to update product'});
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try{
        const currentTenantId = req.tenant_id;
        const {id} = req.params;
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING *', [id,currentTenantId]
        );
        if(result.rowCount == 0 ){
            return res.status(404).json({error: 'Product not found'});
        }
        return res.status(200).json({success: true, message: 'Product deleted successfully'});
    } catch (error) {
        return res.status(500).json({error: 'Failed to delete product'});
    }
};