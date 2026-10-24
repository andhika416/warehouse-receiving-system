import { Router } from 'express';
import { InventoryService } from '../services/inventory.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
// GET /api/inventory
router.get('/', async (req, res, next) => {
    try {
        const search = req.query.search;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await InventoryService.listInventory(search, page, limit);
        res.status(200).json({
            success: true,
            data: result.data,
            meta: result.meta,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/inventory/transactions (Audit Log, Supervisor only)
router.get('/transactions', requireRole('SUPERVISOR'), async (req, res, next) => {
    try {
        const productId = req.query.productId;
        const docId = req.query.receivingDocumentId;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const result = await InventoryService.listTransactions(productId, docId, page, limit);
        res.status(200).json({
            success: true,
            data: result.data,
            meta: result.meta,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/inventory/:productId
router.get('/:productId', async (req, res, next) => {
    try {
        const item = await InventoryService.getByProductId(req.params.productId);
        res.status(200).json({
            success: true,
            data: item,
        });
    }
    catch (err) {
        next(err);
    }
});
export default router;
