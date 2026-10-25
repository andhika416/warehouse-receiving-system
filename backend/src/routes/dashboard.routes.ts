import { Router, Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Requires authentication
router.use(authenticate);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Ambil statistik dan metrik visual dashboard operasional gudang
 */
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await DashboardService.getStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
