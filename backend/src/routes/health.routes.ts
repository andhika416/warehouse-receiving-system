import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';

const router = Router();

/**
 * @route   GET /health
 * @desc    Mengecek koneksi aktif ke database PostgreSQL dan kesehatan server
 * @access  Public
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const dbStart = Date.now();
    const dbRes = await pool.query('SELECT 1 AS alive, NOW() AS db_time;');
    const latency = Date.now() - dbStart;

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'warehouse-receiving-backend',
      database: {
        status: 'CONNECTED',
        engine: 'PostgreSQL',
        latency_ms: latency,
        server_time: dbRes.rows[0].db_time,
      },
    });
  } catch (error: any) {
    console.error('[HEALTH_CHECK_FAILURE]', error);
    res.status(503).json({
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'warehouse-receiving-backend',
      database: {
        status: 'DISCONNECTED',
        error: error.message,
      },
    });
  }
});

export default router;
