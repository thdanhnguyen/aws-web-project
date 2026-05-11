import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import dotenv from 'dotenv';

dotenv.config();

// Parse connection string manually to avoid pg-connection-string
// overriding our ssl config when sslmode is in the URL
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
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL Connected to Amazon RDS');
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL Connection Error:', err);
    throw err;
  }
};
