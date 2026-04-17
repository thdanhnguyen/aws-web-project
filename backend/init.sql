-- Dành cho việc khởi tạo Cơ sở dữ liệu 1 lần duy nhất

-- 1. Bảng lưu thông tin cửa hàng (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng lưu Sản phẩm
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng lưu Giao dịch thanh toán (POS)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  items JSONB NOT NULL, -- Dùng JSONB chuẩn xịn của Postgres để lưu Giỏ hàng
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- (Tùy chọn) Khởi tạo sẵn một cửa hàng mẫu để test
INSERT INTO tenants (id, name) VALUES ('LUXURY-SHOP-01', 'Shop Xịn Xò Số 1') ON CONFLICT (id) DO NOTHING;
