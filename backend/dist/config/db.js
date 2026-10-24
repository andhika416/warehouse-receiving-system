import pg from 'pg';
import { env } from './env.js';
const { Pool } = pg;
export const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});
export async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development' && duration > 200) {
        console.warn(`Slow query (${duration}ms): ${text}`);
    }
    return res;
}
export async function getClient() {
    return await pool.connect();
}
