import { pool } from '../config/db.js';
export async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('[MIGRATION] Starting database schema migrations...');
        await client.query('BEGIN;');
        // 1. Enable UUID Extension
        await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        // 2. ENUM Types
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('OPERATOR', 'SUPERVISOR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE document_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE item_status AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('INBOUND_RECEIVING');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        // 3. Table: users
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_users_username UNIQUE (username),
        CONSTRAINT chk_username_min_length CHECK (char_length(username) >= 3)
      );
    `);
        // 4. Table: products
        await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        unit VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_products_sku UNIQUE (sku),
        CONSTRAINT chk_products_sku_uppercase CHECK (sku = UPPER(sku)),
        CONSTRAINT chk_products_sku_not_empty CHECK (char_length(sku) > 0),
        CONSTRAINT chk_products_name_not_empty CHECK (char_length(name) > 0),
        CONSTRAINT chk_products_unit_not_empty CHECK (char_length(unit) > 0)
      );
    `);
        // 5. Table: inventories (Strict quantity >= 0 constraint)
        await client.query(`
      CREATE TABLE IF NOT EXISTS inventories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_inventories_product UNIQUE (product_id),
        CONSTRAINT fk_inventories_product FOREIGN KEY (product_id) 
          REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_inventories_quantity_non_negative CHECK (quantity >= 0)
      );
    `);
        // 6. Table: receiving_documents
        await client.query(`
      CREATE TABLE IF NOT EXISTS receiving_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        doc_number VARCHAR(64) NOT NULL,
        status document_status NOT NULL DEFAULT 'DRAFT',
        supervisor_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_receiving_documents_doc_number UNIQUE (doc_number),
        CONSTRAINT fk_receiving_documents_supervisor FOREIGN KEY (supervisor_id) 
          REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
        // 7. Table: receiving_items (Strict received_quantity <= expected_quantity constraint)
        await client.query(`
      CREATE TABLE IF NOT EXISTS receiving_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        receiving_document_id UUID NOT NULL,
        product_id UUID NOT NULL,
        expected_quantity INTEGER NOT NULL,
        received_quantity INTEGER NOT NULL DEFAULT 0,
        status item_status NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_receiving_items_doc_product UNIQUE (receiving_document_id, product_id),
        CONSTRAINT fk_receiving_items_document FOREIGN KEY (receiving_document_id) 
          REFERENCES receiving_documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_receiving_items_product FOREIGN KEY (product_id) 
          REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_expected_qty_positive CHECK (expected_quantity > 0),
        CONSTRAINT chk_received_qty_non_negative CHECK (received_quantity >= 0),
        CONSTRAINT chk_strict_no_over_receiving CHECK (received_quantity <= expected_quantity),
        CONSTRAINT chk_item_status_consistency CHECK (
          (received_quantity = 0 AND status = 'PENDING') OR
          (received_quantity > 0 AND received_quantity < expected_quantity AND status = 'PARTIAL') OR
          (received_quantity = expected_quantity AND status = 'COMPLETED')
        )
      );
    `);
        // 8. Table: inventory_transactions (Immutable audit ledger)
        await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL,
        receiving_document_id UUID NOT NULL,
        type transaction_type NOT NULL DEFAULT 'INBOUND_RECEIVING',
        quantity INTEGER NOT NULL,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_inv_tx_product FOREIGN KEY (product_id) 
          REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_inv_tx_document FOREIGN KEY (receiving_document_id) 
          REFERENCES receiving_documents(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_inv_tx_creator FOREIGN KEY (created_by) 
          REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_inv_tx_quantity_positive CHECK (quantity > 0)
      );
    `);
        // 9. Performance & Audit Indexes
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_receiving_documents_status ON receiving_documents(status);
      CREATE INDEX IF NOT EXISTS idx_receiving_documents_created ON receiving_documents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_receiving_items_document ON receiving_items(receiving_document_id);
      CREATE INDEX IF NOT EXISTS idx_receiving_items_product ON receiving_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_inventories_product ON inventories(product_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_tx_product ON inventory_transactions(product_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inventory_tx_document ON inventory_transactions(receiving_document_id);
    `);
        // 10. Triggers for updated_at
        await client.query(`
      CREATE OR REPLACE FUNCTION update_timestamp_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
        const tablesWithUpdatedAt = ['users', 'products', 'inventories', 'receiving_documents', 'receiving_items'];
        for (const table of tablesWithUpdatedAt) {
            await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_${table}_updated_at'
          ) THEN
            CREATE TRIGGER trg_${table}_updated_at BEFORE UPDATE ON ${table}
            FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
          END IF;
        END $$;
      `);
        }
        await client.query('COMMIT;');
        console.log('[MIGRATION] Database schema migrations completed successfully.');
    }
    catch (error) {
        await client.query('ROLLBACK;');
        console.error('[MIGRATION] Migration failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Allow direct execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('migrate')) {
    runMigrations()
        .then(() => pool.end())
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
