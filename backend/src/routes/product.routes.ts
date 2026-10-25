import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductService } from '../services/product.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const createProductSchema = {
  body: z.object({
    sku: z.string().min(2, 'SKU must have at least 2 characters').max(64),
    name: z.string().min(2, 'Name must have at least 2 characters').max(255),
    description: z.string().optional(),
    unit: z.string().min(1, 'Unit is required').max(20),
  }),
};

const updateProductSchema = {
  params: z.object({
    id: z.string().uuid('Invalid UUID format for product ID'),
  }),
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    description: z.string().optional(),
    unit: z.string().min(1).max(20).optional(),
  }),
};

// All product routes require authentication
router.use(authenticate);

// GET /api/products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await ProductService.list(search, page, limit);
    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.getById(req.params.id);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/products (Supervisor only)
router.post(
  '/',
  requireRole('SUPERVISOR'),
  validate(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await ProductService.create(req.body);
      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/products/:id (Supervisor only)
router.put(
  '/:id',
  requireRole('SUPERVISOR'),
  validate(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await ProductService.update(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/products/:id (Supervisor only)
router.delete(
  '/:id',
  requireRole('SUPERVISOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ProductService.delete(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
