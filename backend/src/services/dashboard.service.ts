import { query } from '../config/db.js';

export class DashboardService {
  static async getStats() {
    // 1. Total products
    const prodCountRes = await query('SELECT COUNT(*) FROM products');
    const totalProducts = parseInt(prodCountRes.rows[0].count, 10);

    // 2. Physical stock total
    const stockRes = await query(
      'SELECT COALESCE(SUM(quantity), 0) AS total_physical_stock FROM inventories'
    );
    const totalPhysicalStock = parseInt(stockRes.rows[0].total_physical_stock, 10);

    // 3. Document status breakdown
    const docStatusRes = await query(`
      SELECT status, COUNT(*) AS count
      FROM receiving_documents
      GROUP BY status
    `);
    const docCounts: Record<string, number> = { DRAFT: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    let totalDocuments = 0;
    for (const row of docStatusRes.rows) {
      docCounts[row.status] = parseInt(row.count, 10);
      totalDocuments += parseInt(row.count, 10);
    }

    // 4. Item status breakdown
    const itemStatusRes = await query(`
      SELECT status, COUNT(*) AS count
      FROM receiving_items
      GROUP BY status
    `);
    const itemCounts: Record<string, number> = { COMPLETED: 0, PARTIAL: 0, PENDING: 0 };
    let totalItems = 0;
    for (const row of itemStatusRes.rows) {
      itemCounts[row.status] = parseInt(row.count, 10);
      totalItems += parseInt(row.count, 10);
    }

    const fulfillmentRate =
      totalItems > 0
        ? Math.round((itemCounts.COMPLETED / totalItems) * 100 * 10) / 10
        : 100;

    // 5. Total transactions
    const txCountRes = await query('SELECT COUNT(*) FROM inventory_transactions');
    const totalTransactions = parseInt(txCountRes.rows[0].count, 10);

    // 6. Top products by stock quantity (up to 6)
    const topStockRes = await query(`
      SELECT 
        p.id,
        p.sku, 
        p.name, 
        p.unit, 
        COALESCE(i.quantity, 0) AS quantity
      FROM products p
      LEFT JOIN inventories i ON p.id = i.product_id
      ORDER BY i.quantity DESC NULLS LAST, p.sku ASC
      LIMIT 6
    `);

    // 7. Recent active documents (DRAFT or IN_PROGRESS)
    const activeDocsRes = await query(`
      SELECT 
        rd.id, 
        rd.doc_number, 
        rd.status, 
        rd.created_at,
        u.username AS supervisor_username,
        COUNT(ri.id) AS total_items,
        COUNT(CASE WHEN ri.status = 'COMPLETED' THEN 1 END) AS completed_items
      FROM receiving_documents rd
      JOIN users u ON rd.supervisor_id = u.id
      LEFT JOIN receiving_items ri ON rd.id = ri.receiving_document_id
      WHERE rd.status IN ('IN_PROGRESS', 'DRAFT')
      GROUP BY rd.id, rd.doc_number, rd.status, rd.created_at, u.username
      ORDER BY rd.created_at DESC
      LIMIT 5
    `);

    // 8. Expected vs Received quantities for recent 5 documents
    const docQuantitiesRes = await query(`
      SELECT 
        rd.id,
        rd.doc_number,
        rd.status,
        COALESCE(SUM(ri.expected_quantity), 0) AS total_expected,
        COALESCE(SUM(ri.received_quantity), 0) AS total_received
      FROM receiving_documents rd
      LEFT JOIN receiving_items ri ON rd.id = ri.receiving_document_id
      GROUP BY rd.id, rd.doc_number, rd.status, rd.created_at
      ORDER BY rd.created_at DESC
      LIMIT 5
    `);

    // 9. Recent 5 transactions (audit trail)
    const recentTxRes = await query(`
      SELECT 
        it.id,
        it.quantity,
        it.type,
        it.created_at,
        p.sku,
        p.name AS product_name,
        p.unit,
        rd.doc_number,
        u.username AS operator_username
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      JOIN receiving_documents rd ON it.receiving_document_id = rd.id
      JOIN users u ON it.created_by = u.id
      ORDER BY it.created_at DESC
      LIMIT 5
    `);

    return {
      summary: {
        totalProducts,
        totalPhysicalStock,
        activeDocuments: (docCounts.IN_PROGRESS || 0) + (docCounts.DRAFT || 0),
        inProgressDocuments: docCounts.IN_PROGRESS || 0,
        draftDocuments: docCounts.DRAFT || 0,
        completedDocuments: docCounts.COMPLETED || 0,
        totalDocuments,
        totalItems,
        completedItems: itemCounts.COMPLETED || 0,
        partialItems: itemCounts.PARTIAL || 0,
        pendingItems: itemCounts.PENDING || 0,
        fulfillmentRate,
        totalTransactions,
      },
      documentBreakdown: [
        {
          key: 'COMPLETED',
          label: 'Selesai (Completed)',
          count: docCounts.COMPLETED || 0,
          color: '#10b981', // emerald-500
          description: 'Penerimaan barang telah tuntas diverifikasi 100%',
        },
        {
          key: 'IN_PROGRESS',
          label: 'Sedang Diproses (In Progress)',
          count: docCounts.IN_PROGRESS || 0,
          color: '#3b82f6', // blue-500
          description: 'Barang sedang diperiksa dan dihitung fisik di dermaga gudang',
        },
        {
          key: 'DRAFT',
          label: 'Draft Menunggu',
          count: docCounts.DRAFT || 0,
          color: '#f59e0b', // amber-500
          description: 'Dokumen dibuat supervisor, belum dimulai perhitungan fisik',
        },
      ],
      itemBreakdown: [
        {
          key: 'COMPLETED',
          label: 'Diterima Penuh (100%)',
          count: itemCounts.COMPLETED || 0,
          color: '#10b981',
          description: 'Kuantitas fisik cocok dengan dokumen kirim',
        },
        {
          key: 'PARTIAL',
          label: 'Diterima Sebagian',
          count: itemCounts.PARTIAL || 0,
          color: '#3b82f6',
          description: 'Sebagian kuantitas fisik telah masuk, menunggu sisa barang',
        },
        {
          key: 'PENDING',
          label: 'Belum Diterima',
          count: itemCounts.PENDING || 0,
          color: '#ef4444',
          description: 'Belum ada penghitungan fisik yang dicatat untuk item ini',
        },
      ],
      topStockProducts: topStockRes.rows.map((r: any) => ({
        id: r.id,
        sku: r.sku,
        name: r.name,
        unit: r.unit,
        quantity: parseInt(r.quantity, 10),
      })),
      documentProgress: docQuantitiesRes.rows.map((r: any) => ({
        id: r.id,
        doc_number: r.doc_number,
        status: r.status,
        expected: parseInt(r.total_expected, 10),
        received: parseInt(r.total_received, 10),
        percentage:
          parseInt(r.total_expected, 10) > 0
            ? Math.min(
                100,
                Math.round(
                  (parseInt(r.total_received, 10) / parseInt(r.total_expected, 10)) * 100
                )
              )
            : 0,
      })),
      activeDocuments: activeDocsRes.rows.map((r: any) => ({
        id: r.id,
        doc_number: r.doc_number,
        status: r.status,
        created_at: r.created_at,
        supervisor_username: r.supervisor_username,
        total_items: parseInt(r.total_items, 10) || 0,
        completed_items: parseInt(r.completed_items, 10) || 0,
        percentage:
          parseInt(r.total_items, 10) > 0
            ? Math.round(
                (parseInt(r.completed_items, 10) / parseInt(r.total_items, 10)) * 100
              )
            : 0,
      })),
      recentTransactions: recentTxRes.rows.map((r: any) => ({
        id: r.id,
        quantity: parseInt(r.quantity, 10),
        type: r.type,
        created_at: r.created_at,
        sku: r.sku,
        product_name: r.product_name,
        unit: r.unit,
        doc_number: r.doc_number,
        operator_username: r.operator_username,
      })),
    };
  }
}
