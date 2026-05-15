-- Active: 1778487929206@@db-pos-group2.cpc62oqseou4.ap-southeast-1.rds.amazonaws.com@5432@podgroup2
-- 1. Xóa bảng cũ nếu có (để làm mới hoàn toàn)
DROP TABLE IF EXISTS refresh_tokens, invoice_items, invoices, product_details, products, customers, shifts, users, tenants CASCADE;

-- 2. Tạo bảng tenants (Cửa hàng)
CREATE TABLE tenants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(100) UNIQUE,
  access_code VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tạo bảng users (Tài khoản nhân viên/chủ shop)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng lưu Refresh Token
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng khách hàng
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng sản phẩm (Thông tin chung)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sku_prefix VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Chi tiết sản phẩm (Giá, Kho, Mô tả) — 1-1 với products
CREATE TABLE product_details (
  id SERIAL PRIMARY KEY,
  product_id INTEGER UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  material VARCHAR(50) DEFAULT 'Cotton',
  origin VARCHAR(50) DEFAULT 'Vietnam',
  stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100) DEFAULT 'Uncategorized'
);

-- 8. Hóa đơn
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Chi tiết mặt hàng trong hóa đơn
CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC(10,2) NOT NULL,
  color VARCHAR(20),
  size VARCHAR(10)
);

-- 10. Ca làm việc (Shift Management)
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  opening_cash NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  total_orders INTEGER DEFAULT 0,
  total_sales NUMERIC(15,2) DEFAULT 0
);

-- 11. Index hỗ trợ performance cho các query hay dùng
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_tenant_created ON invoices(tenant_id, created_at DESC);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_shifts_tenant_id ON shifts(tenant_id);
CREATE INDEX idx_shifts_user_status ON shifts(user_id, status);

-- 12. Chḻn dữ liệu mẫu để test
INSERT INTO tenants (id, name, domain, access_code) VALUES 
('LUXURY-SHOP-01', 'Shop Thời Trang Outfit', 'luxury-shop', '123456');

-- Dùng DEFAULT để id tự tăng, tránh conflict sequence khi chạy lại script
INSERT INTO products (tenant_id, name, sku_prefix) VALUES 
('LUXURY-SHOP-01', 'Áo Hoodie Monochrome', 'HD-MC'),
('LUXURY-SHOP-01', 'Quần Jean Slimfit', 'JN-SF'),
('LUXURY-SHOP-01', 'Áo Polo Signature', 'PL-SG');

INSERT INTO product_details (product_id, price, description, material, stock, category)
SELECT p.id, v.price, v.description, v.material, v.stock, v.category
FROM products p
JOIN (VALUES
  ('Áo Hoodie Monochrome', 105.50::NUMERIC, 'Hoodie vải nỉ cao cấp, form rộng unisex', 'Fleece Cotton', 50, 'Áo Khoác'),
  ('Quần Jean Slimfit',      85.00::NUMERIC, 'Quần jean co giãn, màu xám khói',         'Denim',        30, 'Quần'),
  ('Áo Polo Signature',       45.20::NUMERIC, 'Áo polo thoáng khí, phong cách lịch lãm',   'Pique Cotton', 100, 'Áo Thun')
) AS v(name, price, description, material, stock, category) ON p.name = v.name
WHERE p.tenant_id = 'LUXURY-SHOP-01';
