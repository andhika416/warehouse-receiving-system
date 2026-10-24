import { query, getClient } from '../config/db.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';
export class ProductService {
    static async list(search, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const params = [];
        let whereClause = '';
        if (search && search.trim()) {
            params.push(`%${search.trim().toUpperCase()}%`);
            params.push(`%${search.trim()}%`);
            whereClause = 'WHERE sku ILIKE $1 OR name ILIKE $2';
        }
        const countSql = `SELECT COUNT(*) FROM products ${whereClause}`;
        const countRes = await query(countSql, params);
        const total = parseInt(countRes.rows[0].count, 10);
        const dataParams = [...params, limit, offset];
        const dataSql = `
      SELECT p.id, p.sku, p.name, p.description, p.unit, p.created_at, p.updated_at,
             COALESCE(i.quantity, 0) as current_stock
      FROM products p
      LEFT JOIN inventories i ON p.id = i.product_id
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
    static async getById(id) {
        const res = await query(`SELECT p.id, p.sku, p.name, p.description, p.unit, p.created_at, p.updated_at,
              COALESCE(i.quantity, 0) as current_stock
       FROM products p
       LEFT JOIN inventories i ON p.id = i.product_id
       WHERE p.id = $1`, [id]);
        if (res.rowCount === 0) {
            throw new NotFoundError(`Product with id '${id}' not found`);
        }
        return res.rows[0];
    }
    static async create(data) {
        const client = await getClient();
        try {
            await client.query('BEGIN;');
            const upperSku = data.sku.trim().toUpperCase();
            const existing = await client.query('SELECT id FROM products WHERE sku = $1', [upperSku]);
            if (existing.rowCount && existing.rowCount > 0) {
                throw new ConflictError(`Product with SKU '${upperSku}' already exists`);
            }
            const insertRes = await client.query(`INSERT INTO products (sku, name, description, unit)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [upperSku, data.name.trim(), data.description?.trim() || null, data.unit.trim().toUpperCase()]);
            const product = insertRes.rows[0];
            // Auto-create inventory record for stock balance tracking
            await client.query(`INSERT INTO inventories (product_id, quantity)
         VALUES ($1, 0)
         ON CONFLICT (product_id) DO NOTHING`, [product.id]);
            await client.query('COMMIT;');
            return product;
        }
        catch (err) {
            await client.query('ROLLBACK;');
            throw err;
        }
        finally {
            client.release();
        }
    }
    static async update(id, data) {
        const existing = await this.getById(id);
        const updateRes = await query(`UPDATE products 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           unit = COALESCE($3, unit),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`, [
            data.name?.trim() || null,
            data.description !== undefined ? data.description.trim() : null,
            data.unit?.trim().toUpperCase() || null,
            existing.id,
        ]);
        return updateRes.rows[0];
    }
}
