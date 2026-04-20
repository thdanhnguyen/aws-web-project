import { Response, Request } from 'express';
import { pool } from '../config/database'; 
import { sendReceiptEmail } from '../utils/mailer';
import { AuthRequest } from '../middlewares/auth.middleware';

export const createTransaction = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { customer_email, customer_name, items, tenant_id, is_public } = req.body;
    const currentTenantId = req.tenant_id || tenant_id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    await client.query('BEGIN');

    let customerRes = await client.query(
      'SELECT id FROM customers WHERE email = $1 AND tenant_id = $2', 
      [customer_email, currentTenantId]
    );
    let customerId;
    if (customerRes.rowCount === 0) {
      customerRes = await client.query(
        'INSERT INTO customers (tenant_id, name, email) VALUES ($1, $2, $3) RETURNING id',
        [currentTenantId, customer_name || customer_email.split('@')[0], customer_email]
      );
    }
    customerId = customerRes.rows[0].id;

    let subtotal = 0;
    const detailedItems = [];
    
    for (const item of items) {
      const prodRes = await client.query(
        `SELECT p.name, pd.price 
         FROM products p
         JOIN product_details pd ON p.id = pd.product_id
         WHERE p.id = $1 AND p.tenant_id = $2`, 
        [item.product_id, currentTenantId]
      );
      if (prodRes.rowCount === 0) throw new Error(`Product ${item.product_id} not found`);
      
      const realProduct = prodRes.rows[0];
      const itemTotal = parseFloat(realProduct.price) * item.quantity;
      subtotal += itemTotal;
      detailedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: realProduct.price,
        color: item.color,
        size: item.size
      });
    }

    const taxRate = 0.10;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const insertInvoiceRes = await client.query(
      'INSERT INTO invoices (tenant_id, customer_id, subtotal, tax, total_amount) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [currentTenantId, customerId, subtotal, tax, total]
    );
    const invoiceId = insertInvoiceRes.rows[0].id;

    for (const detailedItem of detailedItems) {
      await client.query(
        'INSERT INTO invoice_items (invoice_id, product_id, quantity, price_at_purchase, color, size) VALUES ($1, $2, $3, $4, $5, $6)',
        [invoiceId, detailedItem.product_id, detailedItem.quantity, detailedItem.price_at_purchase, detailedItem.color, detailedItem.size]
      );
    }

    await client.query('COMMIT');

    try {
      await sendReceiptEmail(customer_email, { id: invoiceId, subtotal, tax, total });
      console.log(`Email sent successfully to email: ${customer_email}`);
    } catch (error) {
      console.error("Failed to send email", error);
    }

    return res.status(201).json({
      success: true,
      message: 'Transaction completed successfully (Standard 3NF DB)',
      receipt: { id: invoiceId },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to process transaction (3NF)' });
  } finally {
    client.release();
  }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response) =>{
  try{
    const currentTenantId = req.tenant_id
    const result = await pool.query(
      `SELECT i.id, i.total_amount, i.created_at, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c on i.customer_id = c.id
      WHERE i.tenant_id = $1
      ORDER BY i.created_at DESC`,
      [currentTenantId]
    );
    return res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
}

export const getTransactionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) return res.status(400).json({ error: 'Invoice ID is required' });

    const result = await pool.query('SELECT payment_status FROM invoices WHERE id = $1', [invoiceId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });

    return res.json({ success: true, payment_status: result.rows[0].payment_status });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
};

export const sepayWebhook = async (req: Request, res: Response) => {
  try {
    const apikey = process.env.SEPAY_API_KEY;
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Apikey ${apikey}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const data = req.body;
    if (!data || !data.content) {
      return res.status(400).json({ success: false, message: 'No data' });
    }

    // Tách mã đơn hàng bằng Regex (vd: DH105)
    const content = data.content;
    const regex = /DH(\d+)/i; 
    const match = content.match(regex);

    if (!match) {
      return res.status(200).json({ success: false, message: 'Không tìm thấy mã đơn hàng' });
    }

    const invoiceId = match[1];

    const result = await pool.query(
      "UPDATE invoices SET payment_status = 'Paid' WHERE id = $1 AND payment_status = 'Unpaid' RETURNING id", 
      [invoiceId]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ success: false, message: 'Order not found or already paid' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error: ", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
