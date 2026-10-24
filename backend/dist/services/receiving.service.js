import { query, getClient } from '../config/db.js';
import { BadRequestError, NotFoundError, ConflictError, UnprocessableEntityError, } from '../middleware/errorHandler.js';
export class ReceivingService {
    /**
     * Buat dokumen receiving baru (Hanya Supervisor)
     */
    static async createDocument(docNumber, items, supervisorId) {
        if (!items || items.length === 0) {
            throw new BadRequestError('Receiving document must contain at least one item');
        }
        const client = await getClient();
        try {
            await client.query('BEGIN;');
            const cleanDocNumber = docNumber.trim().toUpperCase();
            // Check unique doc_number
            const existing = await client.query('SELECT id FROM receiving_documents WHERE doc_number = $1', [cleanDocNumber]);
            if (existing.rowCount && existing.rowCount > 0) {
                throw new ConflictError(`Receiving document number '${cleanDocNumber}' already exists`);
            }
            // Insert receiving_documents
            const docRes = await client.query(`INSERT INTO receiving_documents (doc_number, status, supervisor_id)
         VALUES ($1, 'DRAFT', $2)
         RETURNING *`, [cleanDocNumber, supervisorId]);
            const doc = docRes.rows[0];
            // Insert line items
            const createdItems = [];
            for (const item of items) {
                if (item.expectedQuantity <= 0) {
                    throw new BadRequestError(`Expected quantity must be strictly greater than 0 for product ${item.productId}`);
                }
                // Verify product exists
                const prodCheck = await client.query('SELECT id, name, sku FROM products WHERE id = $1', [
                    item.productId,
                ]);
                if (prodCheck.rowCount === 0) {
                    throw new NotFoundError(`Product with id '${item.productId}' not found`);
                }
                const itemRes = await client.query(`INSERT INTO receiving_items (receiving_document_id, product_id, expected_quantity, received_quantity, status)
           VALUES ($1, $2, $3, 0, 'PENDING')
           RETURNING *`, [doc.id, item.productId, item.expectedQuantity]);
                createdItems.push({
                    ...itemRes.rows[0],
                    sku: prodCheck.rows[0].sku,
                    product_name: prodCheck.rows[0].name,
                });
            }
            await client.query('COMMIT;');
            return {
                ...doc,
                total_items: createdItems.length,
                completed_items: 0,
                items: createdItems,
            };
        }
        catch (err) {
            await client.query('ROLLBACK;');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Ambil daftar dokumen receiving dengan pagination dan filter status
     */
    static async listDocuments(status, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const params = [];
        let whereClause = '';
        if (status) {
            params.push(status);
            whereClause = 'WHERE rd.status = $1';
        }
        const countSql = `SELECT COUNT(*) FROM receiving_documents rd ${whereClause}`;
        const countRes = await query(countSql, params);
        const total = parseInt(countRes.rows[0].count, 10);
        const dataParams = [...params, limit, offset];
        const dataSql = `
      SELECT 
        rd.id, rd.doc_number, rd.status, rd.created_at, rd.updated_at,
        u.username AS supervisor_username,
        COUNT(ri.id)::int AS total_items,
        COUNT(CASE WHEN ri.status = 'COMPLETED' THEN 1 END)::int AS completed_items
      FROM receiving_documents rd
      JOIN users u ON rd.supervisor_id = u.id
      LEFT JOIN receiving_items ri ON rd.id = ri.receiving_document_id
      ${whereClause}
      GROUP BY rd.id, u.username
      ORDER BY rd.created_at DESC
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
    /**
     * Detail lengkap dokumen receiving beserta baris item
     */
    static async getDocumentById(id) {
        const docRes = await query(`SELECT rd.id, rd.doc_number, rd.status, rd.supervisor_id, rd.created_at, rd.updated_at,
              u.username AS supervisor_username
       FROM receiving_documents rd
       JOIN users u ON rd.supervisor_id = u.id
       WHERE rd.id = $1`, [id]);
        if (docRes.rowCount === 0) {
            throw new NotFoundError(`Receiving document with id '${id}' not found`);
        }
        const doc = docRes.rows[0];
        const itemsRes = await query(`SELECT 
        ri.id, ri.receiving_document_id, ri.product_id, ri.expected_quantity,
        ri.received_quantity, (ri.expected_quantity - ri.received_quantity) AS remaining_quantity,
        ri.status, ri.created_at, ri.updated_at,
        p.sku, p.name AS product_name, p.unit
       FROM receiving_items ri
       JOIN products p ON ri.product_id = p.id
       WHERE ri.receiving_document_id = $1
       ORDER BY p.sku ASC`, [id]);
        const items = itemsRes.rows;
        const completedItems = items.filter((i) => i.status === 'COMPLETED').length;
        return {
            ...doc,
            total_items: items.length,
            completed_items: completedItems,
            items,
        };
    }
    /**
     * Aturan Bisnis Kritis: POST /api/receivings/:id/receive
     * Transaksi ACID penuh dengan Row-Level Locking (Pessimistic Lock)
     */
    static async receiveItem(input) {
        const { docId, itemId, productId, incrementQuantity, userId } = input;
        if (!incrementQuantity || incrementQuantity <= 0) {
            throw new BadRequestError('Increment quantity must be strictly greater than 0');
        }
        const client = await getClient();
        try {
            await client.query('BEGIN;');
            // 1. Kunci baris receiving_documents (Row-Level Locking)
            const docRes = await client.query(`SELECT id, doc_number, status FROM receiving_documents WHERE id = $1 FOR UPDATE`, [docId]);
            if (docRes.rowCount === 0) {
                throw new NotFoundError(`Receiving document with id '${docId}' not found`);
            }
            const doc = docRes.rows[0];
            // Tolak jika dokumen sudah selesai permanen
            if (doc.status === 'COMPLETED') {
                throw new ConflictError(`Cannot receive items: Document '${doc.doc_number}' is already marked as COMPLETED.`);
            }
            // 2. Kunci baris receiving_items (Row-Level Locking)
            let itemQuery = `SELECT ri.*, p.sku, p.name as product_name
                       FROM receiving_items ri
                       JOIN products p ON ri.product_id = p.id
                       WHERE ri.receiving_document_id = $1 `;
            const itemParams = [docId];
            if (itemId) {
                itemParams.push(itemId);
                itemQuery += `AND ri.id = $2 FOR UPDATE`;
            }
            else if (productId) {
                itemParams.push(productId);
                itemQuery += `AND ri.product_id = $2 FOR UPDATE`;
            }
            else {
                throw new BadRequestError('Either item_id or product_id must be provided');
            }
            const itemRes = await client.query(itemQuery, itemParams);
            if (itemRes.rowCount === 0) {
                throw new NotFoundError('Item not found in this receiving document');
            }
            const item = itemRes.rows[0];
            const currentReceived = item.received_quantity;
            const expected = item.expected_quantity;
            const remainingExpected = expected - currentReceived;
            // VALIDASI BISNIS KRITIS: DILARANG OVER-RECEIVING
            // Jumlah yang diterima tidak boleh melebihi sisa ekspektasi (expected_quantity - received_quantity).
            if (incrementQuantity > remainingExpected) {
                throw new UnprocessableEntityError(`Over-receiving forbidden. Maximum allowed increment is ${remainingExpected}, but requested ${incrementQuantity}.`, {
                    code: 'OVER_RECEIVING_FORBIDDEN',
                    allowed_increment: remainingExpected,
                    requested_increment: incrementQuantity,
                    expected_quantity: expected,
                    current_received: currentReceived,
                });
            }
            const newReceived = currentReceived + incrementQuantity;
            const newStatus = newReceived === expected ? 'COMPLETED' : 'PARTIAL';
            // 3. Update receiving_items
            await client.query(`UPDATE receiving_items 
         SET received_quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`, [newReceived, newStatus, item.id]);
            // 4. Ubah status dokumen menjadi 'IN_PROGRESS' jika sebelumnya 'DRAFT'
            let updatedDocStatus = doc.status;
            if (doc.status === 'DRAFT') {
                await client.query(`UPDATE receiving_documents 
           SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`, [docId]);
                updatedDocStatus = 'IN_PROGRESS';
            }
            // 5. Update stok di tabel inventories dengan Pessimistic Lock / Upsert
            const invRes = await client.query(`INSERT INTO inventories (product_id, quantity, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (product_id) 
         DO UPDATE SET 
           quantity = inventories.quantity + EXCLUDED.quantity,
           updated_at = CURRENT_TIMESTAMP
         RETURNING quantity`, [item.product_id, incrementQuantity]);
            const newOnHandStock = invRes.rows[0].quantity;
            // 6. Tambahkan baris log di inventory_transactions (Immutable audit ledger)
            await client.query(`INSERT INTO inventory_transactions 
           (product_id, receiving_document_id, type, quantity, created_by, created_at)
         VALUES ($1, $2, 'INBOUND_RECEIVING', $3, $4, CURRENT_TIMESTAMP)`, [item.product_id, docId, incrementQuantity, userId]);
            await client.query('COMMIT;');
            return {
                item_id: item.id,
                product_id: item.product_id,
                sku: item.sku,
                product_name: item.product_name,
                increment_quantity: incrementQuantity,
                total_received: newReceived,
                expected_quantity: expected,
                remaining_quantity: expected - newReceived,
                item_status: newStatus,
                document_status: updatedDocStatus,
                current_on_hand_stock: newOnHandStock,
            };
        }
        catch (err) {
            await client.query('ROLLBACK;');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Aturan Bisnis Kritis: POST /api/receivings/:id/complete
     * Hanya Supervisor yang boleh mengeksekusi.
     * Periksa seluruh item dalam dokumen. Jika masih ada item yang belum 100% diterima, tolak dengan HTTP 400.
     */
    static async completeDocument(docId) {
        const client = await getClient();
        try {
            await client.query('BEGIN;');
            // 1. Kunci baris receiving_documents
            const docRes = await client.query(`SELECT id, doc_number, status FROM receiving_documents WHERE id = $1 FOR UPDATE`, [docId]);
            if (docRes.rowCount === 0) {
                throw new NotFoundError(`Receiving document with id '${docId}' not found`);
            }
            const doc = docRes.rows[0];
            if (doc.status === 'COMPLETED') {
                throw new ConflictError(`Receiving document '${doc.doc_number}' is already COMPLETED.`);
            }
            // 2. Kunci dan periksa seluruh item dalam dokumen
            const itemsRes = await client.query(`SELECT 
          ri.id, ri.product_id, ri.expected_quantity, ri.received_quantity, ri.status,
          p.sku, p.name AS product_name
         FROM receiving_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.receiving_document_id = $1
         FOR UPDATE`, [docId]);
            if (itemsRes.rowCount === 0) {
                throw new BadRequestError('Cannot complete a receiving document with no items.');
            }
            // Cari item yang belum 100% diterima
            const incompleteItems = itemsRes.rows.filter((it) => it.received_quantity < it.expected_quantity || it.status !== 'COMPLETED');
            if (incompleteItems.length > 0) {
                throw new BadRequestError('Cannot complete receiving document: one or more items are not fully received.', {
                    incomplete_items: incompleteItems.map((item) => ({
                        item_id: item.id,
                        sku: item.sku,
                        product_name: item.product_name,
                        expected_quantity: item.expected_quantity,
                        received_quantity: item.received_quantity,
                        remaining_quantity: item.expected_quantity - item.received_quantity,
                        status: item.status,
                    })),
                });
            }
            // 3. Jika semua sudah diterima penuh, ubah status dokumen menjadi 'COMPLETED'
            const updatedDoc = await client.query(`UPDATE receiving_documents 
         SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, doc_number, status, updated_at`, [docId]);
            await client.query('COMMIT;');
            return {
                document_id: updatedDoc.rows[0].id,
                doc_number: updatedDoc.rows[0].doc_number,
                status: updatedDoc.rows[0].status,
                completed_at: updatedDoc.rows[0].updated_at,
            };
        }
        catch (err) {
            await client.query('ROLLBACK;');
            throw err;
        }
        finally {
            client.release();
        }
    }
}
