import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.string().default('5432').transform((v) => parseInt(v, 10)),
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().default('warehouse_receiving_db'),
    DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().default('warehouse-system-secure-jwt-secret-key-2026'),
    JWT_EXPIRES_IN: z.string().default('1h'),
    REFRESH_TOKEN_SECRET: z.string().default('warehouse-system-secure-refresh-token-secret-2026'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    process.exit(1);
}
export const env = parsed.data;
