import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';

describe('Warehouse Receiving System - Automated QA Test Suite', () => {
  let supervisorToken: string;
  let supervisorId: string;
  let operatorToken: string;
  let operatorId: string;
  let testProductA: { id: string; sku: string; name: string };
  let testProductB: { id: string; sku: string; name: string };

  beforeAll(async () => {
    // 1. Login Supervisor
    const spvLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'supervisor', password: 'password123' });
    expect(spvLogin.status).toBe(200);
    supervisorToken = spvLogin.body.access_token;
    supervisorId = spvLogin.body.user.id;

    // 2. Login Operator
    const opLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'password123' });
    expect(opLogin.status).toBe(200);
    operatorToken = opLogin.body.access_token;
    operatorId = opLogin.body.user.id;

    // 3. Ambil data produk awal dari database
    const prods = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(prods.status).toBe(200);
    expect(prods.body.data.length).toBeGreaterThanOrEqual(2);
    testProductA = prods.body.data[0];
    testProductB = prods.body.data[1];
  });

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================================================
  // SKENARIO 1: TEST OVER-RECEIVING VALIDATION (HTTP 422)
  // ==========================================================================
  describe('Skenario 1: Test Over-receiving Validation', () => {
    let docId: string;
    let itemId: string;

    beforeAll(async () => {
      // Buat dokumen uji dengan expected 30
      const docRes = await request(app)
        .post('/api/receivings')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          doc_number: `RCV-OVER-${Date.now()}`,
          items: [{ product_id: testProductA.id, expected_quantity: 30 }],
        });
      expect(docRes.status).toBe(201);
      docId = docRes.body.data.id;
      itemId = docRes.body.data.items[0].id;
    });

    it('1.1 Harus menolak request jika received_quantity baru melebihi sisa ekspektasi (return status 422)', async () => {
      // Expected = 30, Received = 0, Mencoba receive 35
      const res = await request(app)
        .post(`/api/receivings/${docId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          item_id: itemId,
          increment_quantity: 35,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Over-receiving forbidden');
      expect(res.body.code).toBe('OVER_RECEIVING_FORBIDDEN');
    });

    it('1.2 Memastikan database state tidak berubah (rollback) setelah error 422', async () => {
      const docCheck = await request(app)
        .get(`/api/receivings/${docId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(docCheck.status).toBe(200);
      const item = docCheck.body.data.items.find((i: any) => i.id === itemId);
      expect(item.received_quantity).toBe(0);
      expect(item.status).toBe('PENDING');
      expect(docCheck.body.data.status).toBe('DRAFT');
    });

    it('1.3 Harus menolak saat penerimaan parsial berikutnya melebihi sisa (expected: 30, current: 20, sisa: 10, attempt: 15 -> 422)', async () => {
      // 1. Terima 20 terlebih dahulu (berhasil)
      const partialRes = await request(app)
        .post(`/api/receivings/${docId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          item_id: itemId,
          increment_quantity: 20,
        });
      expect(partialRes.status).toBe(200);
      expect(partialRes.body.data.total_received).toBe(20);
      expect(partialRes.body.data.remaining_quantity).toBe(10);
      expect(partialRes.body.data.item_status).toBe('PARTIAL');

      // 2. Coba receive 15 saat sisa hanya 10 -> harus 422
      const overRes = await request(app)
        .post(`/api/receivings/${docId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          item_id: itemId,
          increment_quantity: 15,
        });
      expect(overRes.status).toBe(422);
      expect(overRes.body.message).toContain('Maximum allowed increment is 10, but requested 15');
    });

    it('1.4 Harus berhasil saat menerima tepat sesuai sisa kuantitas ekspektasi (increment 10)', async () => {
      const exactRes = await request(app)
        .post(`/api/receivings/${docId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          item_id: itemId,
          increment_quantity: 10,
        });
      expect(exactRes.status).toBe(200);
      expect(exactRes.body.data.total_received).toBe(30);
      expect(exactRes.body.data.remaining_quantity).toBe(0);
      expect(exactRes.body.data.item_status).toBe('COMPLETED');
    });
  });

  // ==========================================================================
  // SKENARIO 2: TEST DOCUMENT COMPLETION (BR-002)
  // ==========================================================================
  describe('Skenario 2: Test Document Completion', () => {
    let multiItemDocId: string;
    let item1Id: string;
    let item2Id: string;

    beforeAll(async () => {
      // Buat dokumen dengan 2 item berbeda
      const res = await request(app)
        .post('/api/receivings')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          doc_number: `RCV-COMPLETION-${Date.now()}`,
          items: [
            { product_id: testProductA.id, expected_quantity: 40 },
            { product_id: testProductB.id, expected_quantity: 60 },
          ],
        });
      expect(res.status).toBe(201);
      multiItemDocId = res.body.data.id;
      item1Id = res.body.data.items[0].id;
      item2Id = res.body.data.items[1].id;
    });

    it('2.1 Menolak penyelesaian dokumen jika semua item masih PENDING (HTTP 400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/receivings/${multiItemDocId}/complete`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('one or more items are not fully received');
      expect(res.body.incomplete_items.length).toBe(2);
    });

    it('2.2 Menolak penyelesaian dokumen jika masih ada item yang berstatus PARTIAL (Item 1 COMPLETED, Item 2 PARTIAL)', async () => {
      // Penuhi Item 1 (40 / 40 -> COMPLETED)
      const item1Res = await request(app)
        .post(`/api/receivings/${multiItemDocId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ item_id: item1Id, increment_quantity: 40 });
      expect(item1Res.status).toBe(200);
      expect(item1Res.body.data.item_status).toBe('COMPLETED');

      // Terima Item 2 sebagian (25 / 60 -> PARTIAL)
      const item2Res = await request(app)
        .post(`/api/receivings/${multiItemDocId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ item_id: item2Id, increment_quantity: 25 });
      expect(item2Res.status).toBe(200);
      expect(item2Res.body.data.item_status).toBe('PARTIAL');

      // Coba selesaikan dokumen -> wajib ditolak 400
      const compRes = await request(app)
        .post(`/api/receivings/${multiItemDocId}/complete`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(compRes.status).toBe(400);
      expect(compRes.body.incomplete_items.length).toBe(1);
      expect(compRes.body.incomplete_items[0].item_id).toBe(item2Id);
      expect(compRes.body.incomplete_items[0].remaining_quantity).toBe(35);
    });

    it('2.3 Berhasil mengubah status dokumen menjadi COMPLETED jika seluruh item telah diterima 100% penuh', async () => {
      // Penuhi sisa Item 2 (35 / 35 -> COMPLETED)
      const fillRes = await request(app)
        .post(`/api/receivings/${multiItemDocId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ item_id: item2Id, increment_quantity: 35 });
      expect(fillRes.status).toBe(200);
      expect(fillRes.body.data.item_status).toBe('COMPLETED');

      // Sekarang semua item sudah COMPLETED, coba selesaikan dokumen
      const compRes = await request(app)
        .post(`/api/receivings/${multiItemDocId}/complete`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(compRes.status).toBe(200);
      expect(compRes.body.success).toBe(true);
      expect(compRes.body.data.status).toBe('COMPLETED');

      // Verifikasi status dokumen di database
      const detailRes = await request(app)
        .get(`/api/receivings/${multiItemDocId}`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.status).toBe('COMPLETED');
    });

    it('2.4 Menolak aksi receive pada dokumen yang telah COMPLETED (HTTP 409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/receivings/${multiItemDocId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ item_id: item1Id, increment_quantity: 1 });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already marked as COMPLETED');
    });

    it('2.5 Menolak penyelesaian ulang pada dokumen yang sudah COMPLETED (HTTP 409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/receivings/${multiItemDocId}/complete`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already COMPLETED');
    });
  });

  // ==========================================================================
  // SKENARIO 3: TEST DATA INTEGRITY & ATOMIC TRANSACTIONS
  // ==========================================================================
  describe('Skenario 3: Test Data Integrity & Atomic Transactions', () => {
    let docId: string;
    let itemId: string;
    let initialInventoryQty: number;

    beforeAll(async () => {
      // 1. Ambil saldo inventaris awal produk
      const invBefore = await request(app)
        .get(`/api/inventory/${testProductA.id}`)
        .set('Authorization', `Bearer ${supervisorToken}`);
      expect(invBefore.status).toBe(200);
      initialInventoryQty = invBefore.body.data.quantity;

      // 2. Buat dokumen baru dengan expected 50
      const docRes = await request(app)
        .post('/api/receivings')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          doc_number: `RCV-ACID-${Date.now()}`,
          items: [{ product_id: testProductA.id, expected_quantity: 50 }],
        });
      expect(docRes.status).toBe(201);
      docId = docRes.body.data.id;
      itemId = docRes.body.data.items[0].id;
    });

    it('3.1 Memastikan status dokumen berubah otomatis dari DRAFT ke IN_PROGRESS saat receive pertama', async () => {
      const recRes = await request(app)
        .post(`/api/receivings/${docId}/receive`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ item_id: itemId, increment_quantity: 15 });

      expect(recRes.status).toBe(200);
      expect(recRes.body.data.document_status).toBe('IN_PROGRESS');
    });

    it('3.2 Memastikan saldo stok inventaris bertambah tepat dan atomik (initial + 15)', async () => {
      const invAfter = await request(app)
        .get(`/api/inventory/${testProductA.id}`)
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(invAfter.status).toBe(200);
      expect(invAfter.body.data.quantity).toBe(initialInventoryQty + 15);
    });

    it('3.3 Memastikan baris audit baru tercatat di inventory_transactions dengan atribut yang tepat', async () => {
      const txRes = await request(app)
        .get('/api/inventory/transactions')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .query({ receivingDocumentId: docId });

      expect(txRes.status).toBe(200);
      expect(txRes.body.data.length).toBe(1);

      const tx = txRes.body.data[0];
      expect(tx.product_id).toBe(testProductA.id);
      expect(tx.receiving_document_id).toBe(docId);
      expect(tx.type).toBe('INBOUND_RECEIVING');
      expect(tx.quantity).toBe(15);
      expect(tx.created_by).toBe(operatorId);
      expect(tx.operator_username).toBe('operator');
    });
  });

  // ==========================================================================
  // SKENARIO 4: TEST VALIDASI AKSES & RBAC
  // ==========================================================================
  describe('Skenario 4: Test Validasi Akses & RBAC (Operator vs Supervisor)', () => {
    let dummyDocId: string;

    beforeAll(async () => {
      // Supervisor membuat satu dokumen
      const res = await request(app)
        .post('/api/receivings')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          doc_number: `RCV-RBAC-${Date.now()}`,
          items: [{ product_id: testProductA.id, expected_quantity: 10 }],
        });
      dummyDocId = res.body.data.id;
    });

    it('4.1 Operator DITOLAK saat membuat dokumen receiving baru (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/receivings')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          doc_number: `RCV-DENIED-${Date.now()}`,
          items: [{ product_id: testProductA.id, expected_quantity: 10 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('4.2 Operator DITOLAK saat mencoba menyelesaikan dokumen receiving (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/receivings/${dummyDocId}/complete`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('4.3 Operator DITOLAK saat mencoba menambahkan produk master baru (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          sku: `SKU-DENIED-${Date.now()}`,
          name: 'Produk Terlarang',
          unit: 'PCS',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4.4 Operator DITOLAK saat mencoba mengubah data produk master (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/products/${testProductA.id}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ name: 'Nama Yang Diubah Ilegal' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4.5 Operator DITOLAK saat mengakses riwayat audit kartu stok (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/inventory/transactions')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4.6 Akses tanpa token (Anonymous) DITOLAK ke endpoint terlindungi (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/receivings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Missing or malformed Authorization header');
    });
  });
});
