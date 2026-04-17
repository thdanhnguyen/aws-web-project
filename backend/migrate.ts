import { pool } from './src/config/database';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
    try {
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log("Đang kết nối tới NeonDB...");
        await pool.query(sql);
        console.log("✅ Đã đập đi xây lại Database thành 6 Bảng 3NF thành công!");
    } catch (error) {
        console.error("❌ Lỗi Migration:", error);
    } finally {
        process.exit();
    }
};

runMigration();
