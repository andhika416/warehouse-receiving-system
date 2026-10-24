import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
export async function runSeeds() {
    const client = await pool.connect();
    try {
        console.log('[SEED] Starting database seeding...');
        await client.query('BEGIN;');
        // 1. Seed Users
        const saltRounds = 12;
        const defaultPasswordHash = await bcrypt.hash('password123', saltRounds);
        // Supervisor user
        const supervisorRes = await client.query(`INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'SUPERVISOR')
       ON CONFLICT (username) DO UPDATE 
         SET password_hash = EXCLUDED.password_hash, role = 'SUPERVISOR'
       RETURNING id, username, role`, ['supervisor', defaultPasswordHash]);
        console.log(`[SEED] Seeded user: ${supervisorRes.rows[0].username} (${supervisorRes.rows[0].role})`);
        // Operator user
        const operatorRes = await client.query(`INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'OPERATOR')
       ON CONFLICT (username) DO UPDATE 
         SET password_hash = EXCLUDED.password_hash, role = 'OPERATOR'
       RETURNING id, username, role`, ['operator', defaultPasswordHash]);
        console.log(`[SEED] Seeded user: ${operatorRes.rows[0].username} (${operatorRes.rows[0].role})`);
        // 2. Seed Initial Products (Minimum 3 items)
        const initialProducts = [
            {
                sku: 'SKU-MON-27',
                name: 'Monitor LED 27 Inch 4K IPS UltraSharp',
                description: 'Professional color-accurate monitor with USB-C and HDMI ports',
                unit: 'UNIT',
            },
            {
                sku: 'SKU-KBD-MECH',
                name: 'Keyboard Mechanical RGB Hot-Swappable',
                description: 'Tenkeyless layout with linear red switches and PBT keycaps',
                unit: 'UNIT',
            },
            {
                sku: 'SKU-CAB-CAT6',
                name: 'Kabel UTP Cat6 Pure Copper 305 Meter',
                description: 'High-speed gigabit network roll cable for indoor warehouse cabling',
                unit: 'ROLL',
            },
            {
                sku: 'SKU-SSD-1TB',
                name: 'SSD NVMe M.2 1TB PCIe Gen4',
                description: 'Read speed up to 7000 MB/s high durability storage drive',
                unit: 'PCS',
            },
        ];
        for (const prod of initialProducts) {
            const prodRes = await client.query(`INSERT INTO products (sku, name, description, unit)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (sku) DO UPDATE 
           SET name = EXCLUDED.name, description = EXCLUDED.description, unit = EXCLUDED.unit
         RETURNING id, sku, name`, [prod.sku, prod.name, prod.description, prod.unit]);
            const product = prodRes.rows[0];
            // Ensure inventory record exists with baseline quantity >= 0
            await client.query(`INSERT INTO inventories (product_id, quantity)
         VALUES ($1, 0)
         ON CONFLICT (product_id) DO NOTHING`, [product.id]);
            console.log(`[SEED] Seeded product & inventory: ${product.sku} - ${product.name}`);
        }
        await client.query('COMMIT;');
        console.log('[SEED] Database seeding completed successfully.');
    }
    catch (error) {
        await client.query('ROLLBACK;');
        console.error('[SEED] Seeding failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Allow direct execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed')) {
    runSeeds()
        .then(() => pool.end())
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
