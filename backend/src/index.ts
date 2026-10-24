import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

async function bootstrap() {
  try {
    // Test PostgreSQL connectivity
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), version();');
    client.release();

    console.log(`[DATABASE] Connected to PostgreSQL: ${res.rows[0].current_database}`);

    const server = app.listen(env.PORT, () => {
      console.log(`[SERVER] Warehouse Receiving API running on http://localhost:${env.PORT}`);
      console.log(`[SERVER] Health check available at: http://localhost:${env.PORT}/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[SERVER] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('[SERVER] HTTP server closed.');
        await pool.end();
        console.log('[DATABASE] PostgreSQL pool disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
