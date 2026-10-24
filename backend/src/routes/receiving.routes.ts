import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReceivingService } from '../services/receiving.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { DocumentStatus } from '../types/index.js';

const router = Router();

const createDocumentSchema = {
  body: z.object({
    doc_number: z.string().min(3).max(64),
    items: z.array(
      z.object({
        product_id: z.string().uuid('Product ID must be a valid UUID'),
        expected_quantity: z.number().int().positive('Expected quantity must be > 0'),
      })
    ).min(1, 'Document must contain at least 1 item'),
  }),
};

const receiveItemSchema = {
  params: z.object({
    id: z.string().uuid('Document ID must be a valid UUID'),
    itemId: z.string().uuid().optional(),
  }),
  body: z.object({
    item_id: z.string().uuid().optional(),
    itemId: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    increment_quantity: z.number().int().positive('Increment quantity must be a positive integer').optional(),
    quantity: z.number().int().positive().optional(),
  }),
};

const completeDocumentSchema = {
  params: z.object({
    id: z.string().uuid('Document ID must be a valid UUID'),
  }),
};

// All receiving routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/receivings
 * @desc    Ambil daftar dokumen receiving (DRAFT, IN_PROGRESS, COMPLETED)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as DocumentStatus | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await ReceivingService.listDocuments(status, page, limit);
    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/receivings
 * @desc    Buat dokumen receiving baru (Hanya Supervisor)
 */
router.post(
  '/',
  requireRole('SUPERVISOR'),
  validate(createDocumentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { doc_number, items } = req.body;
      const formattedItems = items.map((i: any) => ({
        productId: i.product_id,
        expectedQuantity: i.expected_quantity,
      }));

      const document = await ReceivingService.createDocument(
        doc_number,
        formattedItems,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   GET /api/receivings/:id
 * @desc    Detail lengkap dokumen receiving dan status baris item
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await ReceivingService.getDocumentById(req.params.id);
    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/receivings/:id/receive
 * @route   POST /api/receivings/:id/items/:itemId/receive
 * @desc    Catat penerimaan fisik item (parsial / penuh).
 *          Menerapkan transaksi ACID penuh & pessimistic row locking.
 *          Menolak over-receiving dengan HTTP 422 jika melebihi sisa ekspektasi.
 */
const handleReceive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = req.params.id;
    const itemId = req.params.itemId || req.body.item_id || req.body.itemId;
    const productId = req.body.product_id || req.body.productId;
    const incrementQuantity = req.body.increment_quantity ?? req.body.quantity;

    const result = await ReceivingService.receiveItem({
      docId,
      itemId,
      productId,
      incrementQuantity,
      userId: req.user!.id,
    });

    res.status(200).json({
      success: true,
      message: 'Quantity successfully received and inventory updated',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

router.post('/:id/receive', validate(receiveItemSchema), handleReceive);
router.post('/:id/items/:itemId/receive', validate(receiveItemSchema), handleReceive);

/**
 * @route   POST /api/receivings/:id/complete
 * @desc    Selesaikan dokumen receiving (Hanya Supervisor).
 *          Memverifikasi seluruh item. Jika ada item belum 100% diterima, tolak dengan HTTP 400.
 */
router.post(
  '/:id/complete',
  requireRole('SUPERVISOR'),
  validate(completeDocumentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ReceivingService.completeDocument(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Receiving document has been successfully verified and marked as COMPLETED',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
