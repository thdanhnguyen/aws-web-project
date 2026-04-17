import { Request, Response } from 'express';
import { pool } from '../config/database'; 
// import { sendReceiptEmail } from '../utils/mailer';

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const currentTenantId = req.tenant_id;
    const { customer_email, items } = req.body;

    if(!items || items.length === 0){
      return res.status(400).json({error: 'Items are required'});
    }

    // Simulate Calculation (Subtotal, Tax, Total)
    let subtotal = 0;
    const detailedItems = [];
    
    // items is an array of { product_id, quantity, price }
    for(const item of items){
      const prodRes = await pool.query(
        'SELECT name, price FROM products WHERE id = $1 AND tenant_id = $2', [item.product_id, currentTenantId]
      );
      if(prodRes.rowCount == 0) throw new Error(`Product ${item.product_id} not found`);
      
      const realProduct = prodRes.rows[0];
      const itemTotal = parseFloat(realProduct.price) * item.quantity;
      subtotal += itemTotal;
      detailedItems.push({
        name: realProduct.name,
        quantity: item.quantity,
        unit_price: realProduct.price,
        total: itemTotal
      });
    }

    const taxRate = 0.10
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // TODO: Save to database using `tenant_id` to isolate data
    // INSERT INTO transactions (tenant_id, customer_email, subtotal, tax, total, ... ) 

    // Simulate sending email
    // if (customer_email) {
    //   await sendReceiptEmail(customer_email, { subtotal, tax, total });
    // }
    const insertRes = await pool.query(
      'INSERT INTO transaction (tenant_id, customer_email, subtotal, tax, total, items) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [currentTenantId, customer_email, subtotal, tax, total, JSON.stringify(detailedItems)]
    )
    return res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      receipt: insertRes.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process transaction' });
  }
};
