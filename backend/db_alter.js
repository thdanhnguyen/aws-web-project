const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log("Altering table invoices...");
    await pool.query("ALTER TABLE invoices ADD COLUMN payment_status VARCHAR(20) DEFAULT 'Unpaid';");
    console.log("Success!");
  } catch (err) {
    if (err.code === '42701') {
      console.log("Column payment_status already exists. Ignoring.");
    } else {
      console.error(err);
    }
  } finally {
    await pool.end();
  }
}

main();
