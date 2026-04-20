DROP TABLE IF EXISTS refresh_tokens, invoice_items, invoices, transaction, transactions, product_details, products, customers, users, tenants CASCADE;

CREATE TABLE tenants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sku_prefix VARCHAR(10), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_details (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  material VARCHAR(50) DEFAULT 'Cotton', 
  origin VARCHAR(50) DEFAULT 'Vietnam'   
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC(10,2) NOT NULL,
  color VARCHAR(20),
  size VARCHAR(10)
);

ALTER TABLE tenants ADD COLUMN domain VARCHAR(100) UNIQUE;
ALTER TABLE tenants ADD COLUMN access_code VARCHAR(50);

INSERT INTO tenants (id, name) VALUES ('LUXURY-SHOP-01', 'Shop Thời Trang Outfit');

INSERT INTO products (id, tenant_id, name, sku_prefix) VALUES 
(1, 'LUXURY-SHOP-01', 'Áo Hoodie Monochrome', 'HD-MC'),
(2, 'LUXURY-SHOP-01', 'Quần Jean Slimfit', 'JN-SF'),
(3, 'LUXURY-SHOP-01', 'Áo Polo Signature', 'PL-SG');

INSERT INTO product_details (product_id, price, description, material) VALUES 
(1, 105.50, 'Hoodie vải nỉ cao cấp, form rộng unisex', 'Fleece Cotton'),
(2, 85.00, 'Quần jean co giãn, màu xám khói', 'Denim'),
(3, 45.20, 'Áo polo thoáng khí, phong cách lịch lãm', 'Pique Cotton');
