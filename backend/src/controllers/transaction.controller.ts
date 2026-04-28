import { Response, Request } from 'express';
import { pool } from '../config/database'; 
import { sendReceiptEmail } from '../utils/mailer';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/asyncHandler';

export const createTransaction = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { customer_email, customer_name, items, tenant_id, is_public, payment_method } = req.body;
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
      // [NEW] Thêm pd.stock vào SELECT để kiểm tra tồn kho trước khi bán
      // FOR UPDATE: khóa dòng lại trong transaction để tránh race condition 
      // (2 người cùng mua 1 sản phẩm còn 1 cái, chỉ người đầu tiên thành công)
      const prodRes = await client.query(
        `SELECT p.name, pd.price, pd.stock, pd.id as detail_id
         FROM products p
         JOIN product_details pd ON p.id = pd.product_id
         WHERE p.id = $1 AND p.tenant_id = $2
         FOR UPDATE`,
        [item.product_id, currentTenantId]
      );
      if (prodRes.rowCount === 0) throw AppError.badRequest(`Sản phẩm #${item.product_id} không thuộc shop này hoặc không tồn tại`);
      
      const realProduct = prodRes.rows[0];

      // [NEW] Kiểm tra tồn kho: nếu stock < số lượng đặt mua thì báo lỗi ngay
      if (realProduct.stock < item.quantity) {
        throw AppError.badRequest(`Sản phẩm "${realProduct.name}" không đủ hàng. Còn lại: ${realProduct.stock}`);
      }

      // [NEW] Trừ tồn kho ngay sau khi xác nhận đủ hàng (trong cùng 1 transaction)
      await client.query(
        'UPDATE product_details SET stock = stock - $1 WHERE id = $2',
        [item.quantity, realProduct.detail_id]
      );

      const itemTotal = parseFloat(realProduct.price) * item.quantity;
      subtotal += itemTotal;
      detailedItems.push({
        product_id: item.product_id,
        product_name: realProduct.name,
        quantity: item.quantity,
        price_at_purchase: realProduct.price,
        color: item.color,
        size: item.size
      });
    }

    const taxRate = 0.10;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const initialStatus = payment_method === 'cash' ? 'Paid' : 'Unpaid';
    const insertInvoiceRes = await client.query(
      'INSERT INTO invoices (tenant_id, customer_id, subtotal, tax, total_amount, payment_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [currentTenantId, customerId, subtotal, tax, total, initialStatus]
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
      // [LEARN] Sau khi COMMIT thành công, gửi email bất đồng bộ (async).
      // Lỗi email KHÔNG làm rollback giao dịch — đây là thiết kế đúng vì DB đã ghi thành công.
      const tenantRes = await pool.query('SELECT name FROM tenants WHERE id = $1', [currentTenantId]);
      const tenantName = tenantRes.rows[0]?.name || currentTenantId;

      let cashierName = "System";
      if (req.user_id) {
        const userRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [req.user_id]);
        if (userRes.rowCount && userRes.rowCount > 0) {
          cashierName = userRes.rows[0].full_name || userRes.rows[0].email;
        }
      }

      await sendReceiptEmail(customer_email, {
        id: invoiceId,
        tenantName,
        customerName: customer_name || customer_email,
        cashierName,
        subtotal,
        tax,
        total,
        items: detailedItems,  // Danh sách sản phẩm đầy đủ
        createdAt: new Date()  // Thời điểm tạo đơn
      });
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
    throw error;
  } finally {
    client.release();
  }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const currentTenantId = req.tenant_id;

    // [LEARN] Dùng LEFT JOIN để lấy thêm thông tin khách hàng từ bảng customers.
    // LEFT JOIN nghĩa là: lấy tất cả hóa đơn, kể cả những đơn không có khách hàng liên kết.
    // Thêm payment_status để hiển thị badge Paid/Unpaid trên giao diện.
    const result = await pool.query(
      `SELECT i.id, i.total_amount, i.created_at, i.payment_status, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.tenant_id = $1
      ORDER BY i.created_at DESC
      LIMIT 100`,  // [BEST PRACTICE] Luôn giới hạn số lượng kết quả trả về để tránh quá tải memory
      [currentTenantId]
    );
    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    throw error;
  }
};

export const getTransactionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) return res.status(400).json({ error: 'Invoice ID is required' });

    const result = await pool.query('SELECT payment_status FROM invoices WHERE id = $1', [invoiceId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });

    return res.json({ success: true, payment_status: result.rows[0].payment_status });
  } catch (error) {
    throw error;
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
    throw error;
  }
};
