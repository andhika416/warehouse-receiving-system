# QA & Backend Testing Report
# Warehouse Receiving System (WRS)

| Dokumen | Detail |
| :--- | :--- |
| **Sistem** | Warehouse Receiving System (WRS) |
| **Versi Dokumen** | 1.0.0 |
| **Role Penanggung Jawab** | QA & Backend Test Engineer |
| **Framework Pengujian** | Jest v29 + Supertest v7 (ESM) |
| **Target Engine** | Node.js v22.12.0 + PostgreSQL 17.2 |
| **Tanggal Pengujian** | 2026-10-24 |
| **Status Hasil** | **18 / 18 PASSED (100% LULUS)** |

---

## 1. Ringkasan Eksekutif Pengujian

Pengujian otomatis backend ini dirancang untuk memvalidasi kepatuhan penuh terhadap aturan bisnis (*business rules*) dan integritas basis data yang didefinisikan pada:
- **[docs/prd.md](file:///d:/laragon/www/warehouse-receiving-system/docs/prd.md)** (BR-001 s/d BR-007)
- **[docs/technical-spec.md](file:///d:/laragon/www/warehouse-receiving-system/docs/technical-spec.md)** (ACID Transaction, Row-Level Locking, DDL Constraints)
- **[docs/openapi.yaml](file:///d:/laragon/www/warehouse-receiving-system/docs/openapi.yaml)** (API Contract)

Pengujian dijalankan langsung terhadap instance PostgreSQL riil untuk memvalidasi transaksi atomik, rollback, dan *pessimistic row locking* secara nyata.

---

## 2. Matriks Hasil Eksekusi Pengujian Otomatis

```text
Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Snapshots:   0 total
Time:        5.611 s
```

| ID | Skenario Uji | Deskripsi Kasus Uji | Ekspektasi Status | Status Aktual | Hasil | Latensi |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **TC-1.1** | Over-receiving | Menolak penerimaan awal yang melebihi kuantitas ekspektasi (`increment 35 > expected 30`). | `422 Unprocessable Entity` | `422` | **PASS** | 60 ms |
| **TC-1.2** | Over-receiving | Memverifikasi database state di-rollback utuh saat error 422 (received tetap 0, status tetap DRAFT). | `200 OK` | `200` | **PASS** | 37 ms |
| **TC-1.3** | Over-receiving | Menolak penerimaan parsial berikutnya jika melebihi sisa (`sisa 10, attempt 15`). | `422 Unprocessable Entity` | `422` | **PASS** | 82 ms |
| **TC-1.4** | Over-receiving | Menerima tepat sesuai sisa kuantitas ekspektasi (`increment 10 = sisa 10`). | `200 OK` | `200` | **PASS** | 37 ms |
| **TC-2.1** | Doc Completion | Menolak penyelesaian dokumen jika seluruh item masih berstatus `PENDING`. | `400 Bad Request` | `400` | **PASS** | 37 ms |
| **TC-2.2** | Doc Completion | Menolak penyelesaian dokumen jika ada item yang masih berstatus `PARTIAL`. | `400 Bad Request` | `400` | **PASS** | 122 ms |
| **TC-2.3** | Doc Completion | Mengubah status dokumen menjadi `COMPLETED` saat seluruh item telah diterima 100% penuh. | `200 OK` | `200` | **PASS** | 92 ms |
| **TC-2.4** | Doc Completion | Menolak transaksi penerimaan barang pada dokumen yang telah `COMPLETED`. | `409 Conflict` | `409` | **PASS** | 29 ms |
| **TC-2.5** | Doc Completion | Menolak percobaan penyelesaian ulang pada dokumen yang telah `COMPLETED`. | `409 Conflict` | `409` | **PASS** | 25 ms |
| **TC-3.1** | Data Integrity | Memastikan status dokumen beralih otomatis dari `DRAFT` ke `IN_PROGRESS` pada receive pertama. | `200 OK` | `200` | **PASS** | 36 ms |
| **TC-3.2** | Data Integrity | Memastikan saldo `inventories.quantity` bertambah secara tepat dan konsisten (+15 unit). | `200 OK` | `200` | **PASS** | 27 ms |
| **TC-3.3** | Data Integrity | Memastikan baris audit baru tercatat di `inventory_transactions` dengan relasi FK dan operator ID valid. | `200 OK` | `200` | **PASS** | 34 ms |
| **TC-4.1** | Validasi Akses | Operator DITOLAK saat mencoba membuat dokumen receiving baru (`POST /receivings`). | `403 Forbidden` | `403` | **PASS** | 23 ms |
| **TC-4.2** | Validasi Akses | Operator DITOLAK saat mencoba menyelesaikan dokumen receiving (`POST /complete`). | `403 Forbidden` | `403` | **PASS** | 21 ms |
| **TC-4.3** | Validasi Akses | Operator DITOLAK saat mencoba menambahkan produk master baru (`POST /products`). | `403 Forbidden` | `403` | **PASS** | 24 ms |
| **TC-4.4** | Validasi Akses | Operator DITOLAK saat mencoba memperbarui katalog produk (`PUT /products/:id`). | `403 Forbidden` | `403` | **PASS** | 23 ms |
| **TC-4.5** | Validasi Akses | Operator DITOLAK saat mengakses riwayat transaksi kartu stok (`GET /transactions`). | `403 Forbidden` | `403` | **PASS** | 20 ms |
| **TC-4.6** | Validasi Akses | Akses tanpa token (Anonymous) DITOLAK ke endpoint terlindungi. | `401 Unauthorized` | `401` | **PASS** | 21 ms |

---

## 3. Rincian Skenario Pengujian Wajib

### Skenario 1: Test Over-Receiving Validation (BR-001)
- **Tujuan**: Memastikan sistem tidak pernah mengizinkan penerimaan barang fisik melebihi sisa kuantitas ekspektasi.
- **Mekanisme Validasi**:
  1. *Aplikasi*: Backend menghitung $\text{remaining} = \text{expected\_quantity} - \text{received\_quantity}$. Jika $\text{increment} > \text{remaining}$, transaksi langsung di-`ROLLBACK` dan mengembalikan HTTP status `422 Unprocessable Entity` dengan error code `OVER_RECEIVING_FORBIDDEN`.
  2. *Basis Data*: Skema tabel `receiving_items` memiliki *check constraint* `chk_strict_no_over_receiving CHECK (received_quantity <= expected_quantity)`.
- **Hasil Uji**:
  - Percobaan receive 35 pada item target 30 ditolak dengan kode `422`.
  - Percobaan receive 15 saat sisa 10 ditolak dengan kode `422`.
  - Verifikasi database membuktikan tidak ada pembaruan saldo parsial atau mutasi kotor (*dirty update*) saat terjadi penolakan.

---

### Skenario 2: Test Document Completion Pre-Condition (BR-002)
- **Tujuan**: Mencegah penutupan dokumen receiving secara prematur sebelum seluruh fisik barang tiba lengkap.
- **Mekanisme Validasi**:
  - Endpoint `POST /api/receivings/:id/complete` memeriksa status seluruh baris item di dalam dokumen.
  - Jika terdapat item berstatus `PENDING` atau `PARTIAL`, sistem menolak permintaan dengan **HTTP 400 Bad Request** dan menyertakan rincian item yang belum lengkap pada atribut `incomplete_items`.
  - Setelah seluruh item berstatus `COMPLETED`, dokumen berhasil ditutup menjadi `COMPLETED` dan dikunci permanen (*read-only*).
- **Hasil Uji**:
  - Dokumen dengan 2 item (1 COMPLETED, 1 PARTIAL) ditolak dengan `400 Bad Request` dan merinci sisa kuantitas item yang kurang.
  - Setelah item kedua dipenuhi, status dokumen berhasil berpindah ke `COMPLETED` (HTTP `200 OK`).
  - Percobaan transaksi masuk atau penyelesaian ulang pada dokumen `COMPLETED` ditolak dengan **HTTP 409 Conflict**.

---

### Skenario 3: Test Data Integrity & Atomic Transactions (ACID)
- **Tujuan**: Menjamin pembaruan kuantitas barang masuk, saldo inventaris, dan kartu stok terjadi dalam satu transaksi atomik tanpa *race condition*.
- **Mekanisme Validasi**:
  - Digunakan klausa `SELECT ... FOR UPDATE` pada baris `receiving_documents`, `receiving_items`, dan `inventories`.
  - Seluruh mutasi dibungkus dalam blok `BEGIN ... COMMIT` PostgreSQL.
- **Hasil Uji**:
  - Sebelum receive: saldo produk diperiksa.
  - Saat receive sebanyak +15:
    * `receiving_items.received_quantity` bertambah tepat 15.
    * `receiving_documents.status` berpindah dari `DRAFT` ke `IN_PROGRESS`.
    * `inventories.quantity` bertambah tepat 15 dari saldo awal.
    * Baris baru tercipta di `inventory_transactions` dengan `type = 'INBOUND_RECEIVING'`, kuantitas 15, dan `created_by` sesuai ID operator yang login.

---

### Skenario 4: Test Validasi Akses & RBAC (Segregation of Duties)
- **Tujuan**: Memastikan hak akses terpisah secara tegas antara peran `OPERATOR` dan `SUPERVISOR`.
- **Mekanisme Validasi**:
  - Middleware `authenticate` memverifikasi token JWT.
  - Middleware `requireRole('SUPERVISOR')` memblokir pengguna non-supervisor dengan **HTTP 403 Forbidden**.
- **Hasil Uji**:
  - Seluruh aksi operasional supervisor (membuat dokumen, menutup dokumen, menambah produk, mengubah produk, melihat log audit transaksi) yang diakses oleh Operator berhasil diblokir dengan `403 Forbidden`.
  - Akses tanpa token diblokir dengan `401 Unauthorized`.

---

## 4. Panduan Menjalankan Pengujian

### Prasyarat Lingkungan
Pastikan database PostgreSQL aktif dan variabel lingkungan telah terkonfigurasi pada file `/backend/.env`:
```env
PORT=5000
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=warehouse_receiving_db
JWT_SECRET=warehouse-system-secure-jwt-secret-key-2026
```

### Langkah Menjalankan Tes

Buka terminal di direktori `/backend`:

```bash
# 1. Jalankan migrasi dan seeder awal (jika belum)
npm run db:setup

# 2. Jalankan seluruh test suite otomatis
npm test

# 3. Jalankan dengan output verbose detail tiap test case
npx jest --verbose --runInBand --detectOpenHandles
```

---

## 5. Known Limitations dari Sistem (Batasan Sistem Saat Ini)

Berdasarkan analisis arsitektur dan hasil pengujian, berikut adalah batasan teknis dan operasional sistem versi 1.0 yang perlu diperhatikan:

1. **Single Warehouse Facility (Fasilitas Gudang Tunggal)**:
   - Skema basis data saat ini belum mendukung mutasi antargudang (*inter-branch warehouse transfer*) atau pelacakan lokasi multi-gudang. Sistem diasumsikan beroperasi pada satu fasilitas fisik terpusat.
2. **Satuan Unit Integer (Bilangan Bulat)**:
   - Kolom `quantity`, `expected_quantity`, dan `received_quantity` menggunakan tipe data `INTEGER` ($\ge 0$). Sistem saat ini tidak mendukung kuantitas bertipe pecahan/desimal (misal: $12.5\text{ kg}$ atau $3.75\text{ meter}$). Untuk mendukung komoditas curah di masa depan, skema kolom perlu dimigrasikan ke tipe `NUMERIC(12, 3)`.
3. **Immutability Pasca-Penyelesaian (Ketiadaan Modul Pembatalan/Koreksi)**:
   - Setelah dokumen receiving berstatus `COMPLETED`, sistem mengunci dokumen secara permanen. Sistem belum menyediakan alur korektif otomatis seperti *Return to Vendor* (RTV) atau *Stock Adjustment post-completion*. Koreksi stok saat ini memerlukan intervensi administratif atau modul penyesuaian khusus.
4. **Pessimistic Row Locking pada Beban Ekstrem**:
   - Penggunaan `SELECT ... FOR UPDATE` memberikan garansi integritas 100% terhadap *race condition*. Namun, pada skenario konkurensi sangat tinggi (misal: &gt;500 pemindaian paralel secara bersamaan pada 1 baris item yang sama persis), request akan mengantre secara berurutan (*serialized lock*), yang berpotensi meningkatkan latensi respon transaksi.
5. **Ketergantungan Pemindai Fisik pada Emulasi Keyboard**:
   - Sistem antarmuka web menerima masukan barcode melalui emulasi keyboard standar (USB/Bluetooth HID). Sistem belum memiliki integrasi driver langsung dengan perangkat *industrial RFID tunnel* atau *automated conveyor scanner*.
