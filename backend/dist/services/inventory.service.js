import { query } from '../config/db.js';
import { NotFoundError } from '../middleware/errorHandler.js';
export class InventoryService {
    static async listInventory(search, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const params = [];
        let whereClause = '';
        if (search && search.trim()) {
            params.push(`%${search.trim().toUpperCase()}%`);
            params.push(`%${search.trim()}%`);
            whereClause = 'WHERE p.sku ILIKE $1 OR p.name ILIKE $2';
        }
        const countSql = `SELECT COUNT(*) FROM inventories i JOIN products p ON i.product_id = p.id ${whereClause}`;
        const countRes = await query(countSql, params);
        const total = parseInt(countRes.rows[0].count, 10);
        const dataParams = [...params, limit, offset];
        const dataSql = `
      SELECT 
        i.id, i.product_id, i.quantity, i.updated_at,
        p.sku, p.name AS product_name, p.unit, p.description
      FROM inventories i
      JOIN products p ON i.product_id = p.id
      ${whereClause}
      ORDER BY p.sku ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
        const dataRes = await query(dataSql, dataParams);
        return {
            data: dataRes.rows,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    static async getByProductId(productId) {
        const res = await query(`SELECT 
        i.id, i.product_id, i.quantity, i.updated_at,
        p.sku, p.name AS product_name, p.unit, p.description
       FROM inventories i
       JOIN products p ON i.product_id = p.id
       WHERE i.product_id = $1`, [productId]);
        if (res.rowCount === 0) {
            throw new NotFoundError(`Inventory for product id '${productId}' not found`);
        }
        return res.rows[0];
    }
    static async listTransactions(productId, receivingDocumentId, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const params = [];
        const conditions = [];
        if (productId) {
            params.push(productId);
            conditions.push(`it.product_id = $${params.length}`);
        }
        if (receivingDocumentId) {
            params.push(receivingDocumentId);
            conditions.push(`it.receiving_document_id = $${params.length}`);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countSql = `SELECT COUNT(*) FROM inventory_transactions it ${whereClause}`;
        const countRes = await query(countSql, params);
        const total = parseInt(countRes.rows[0].count, 10);
        const dataParams = [...params, limit, offset];
        const dataSql = `
      SELECT 
        it.id, it.product_id, it.receiving_document_id, it.type, it.quantity,
        it.created_by, it.created_at,
        p.sku, p.name AS product_name,
        rd.doc_number,
        u.username AS operator_username
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      JOIN receiving_documents rd ON it.receiving_document_id = rd.id
      JOIN users u ON it.created_by = u.id
      ${whereClause}
      ORDER BY it.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
        const dataRes = await query(dataSql, dataParams);
        return {
            data: dataRes.rows,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
}
