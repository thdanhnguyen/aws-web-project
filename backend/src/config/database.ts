import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL_NO_SSL,
  ssl: {rejectUnauthorized: false}
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL Connected');
    client.release();
  } catch (err) {
    console.error('PostgreSQL Connection Error:', err);
    throw err;
  }
};
