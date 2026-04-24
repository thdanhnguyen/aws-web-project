-- [MIGRATION] Thêm cột stock vào bảng product_details
-- Chạy file này một lần duy nhất trên DB để thêm tính năng quản lý tồn kho.
-- stock: số lượng tồn kho hiện tại, mặc định 0 để bắt buộc nhập kho trước khi bán.

ALTER TABLE product_details ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;

-- Cập nhật dữ liệu mẫu có sẵn (demo data)
UPDATE product_details SET stock = 50 WHERE product_id = 1;
UPDATE product_details SET stock = 30 WHERE product_id = 2;
UPDATE product_details SET stock = 100 WHERE product_id = 3;
