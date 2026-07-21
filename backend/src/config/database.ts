import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = parse(process.env.DATABASE_URL!);

export const pool = new Pool({
  host:     dbConfig.host     ?? undefined,
  port:     Number(dbConfig.port) || 5432,
  user:     dbConfig.user     ?? undefined,
  password: dbConfig.password ?? undefined,
  database: dbConfig.database ?? undefined,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,      
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL Connected to Amazon RDS');
    client.release();
  } catch (err) {
    console.error('PostgreSQL Connection Error:', err);
    throw err;
  }
};
