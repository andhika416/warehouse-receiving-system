# Warehouse Receiving System - Backend REST API

Layanan backend REST API untuk sistem manajemen penerimaan barang gudang (*Warehouse Receiving System*), diimplementasikan menggunakan **Node.js (Express)**, **TypeScript**, dan basis data **PostgreSQL**.

Arsitektur dan aturan bisnis mengacu penuh pada:
- [PRD (Product Requirements Document)](file:///d:/laragon/www/warehouse-receiving-system/docs/prd.md)
- [Technical Specification](file:///d:/laragon/www/warehouse-receiving-system/docs/technical-spec.md)
- [OpenAPI 3.0 Specification](file:///d:/laragon/www/warehouse-receiving-system/docs/openapi.yaml)
- [Mermaid ERD](file:///d:/laragon/www/warehouse-receiving-system/docs/erd.mmd)

---

## 1. Prasyarat & Lingkungan

- **Node.js**: v18+ (Diverifikasi pada v22.12.0)
- **PostgreSQL**: 15+ (Diverifikasi pada PostgreSQL 17)
- **Database**: `warehouse_receiving_db`

---

## 2. Kredensial Pengguna Default (Seeder)

Setelah menjalankan `npm run seed`, akun default berikut siap digunakan:

| Role | Username | Password | Deskripsi Wewenang |
| :--- | :--- | :--- | :--- |
| **Warehouse Supervisor** | `supervisor` | `password123` | Buat dokumen receiving, selesaikan dokumen (`complete`), kelola katalog produk, lihat laporan kartu stok. |
| **Warehouse Operator** | `operator` | `password123` | Lihat dokumen aktif, catat fisik barang masuk (`receive` parsial / penuh). |

---

## 3. Data Produk Awal (Seeded Products)

1. `SKU-MON-27` – Monitor LED 27 Inch 4K IPS UltraSharp (Unit: `UNIT`)
2. `SKU-KBD-MECH` – Keyboard Mechanical RGB Hot-Swappable (Unit: `UNIT`)
3. `SKU-CAB-CAT6` – Kabel UTP Cat6 Pure Copper 305 Meter (Unit: `ROLL`)
4. `SKU-SSD-1TB` – SSD NVMe M.2 1TB PCIe Gen4 (Unit: `PCS`)

---

## 4. Perintah Operasional

```bash
# 1. Instalasi dependensi
npm install

# 2. Menjalankan migrasi skema tabel & constraint integritas PostgreSQL
npm run migrate

# 3. Menjalankan seeder data pengguna & produk awal
npm run seed

# Atau jalankan keduanya sekaligus:
npm run db:setup

# 4. Menjalankan server dalam mode pengembangan (live reload)
npm run dev

# 5. Menjalankan pengujian otomatis (Integration Tests)
npm test

# 6. Kompilasi production TypeScript
npm run build
npm start
```

---

## 5. Ringkasan Endpoint Utama

### Health Check
- `GET /health` – Memeriksa koneksi aktif ke PostgreSQL dan mengembalikan status `200 OK`.

### Autentikasi
- `POST /api/auth/login` – Login dengan `username` dan `password`, mengembalikan access token JWT & refresh token.
- `POST /api/auth/refresh` – Memperbarui access token dengan refresh token.
- `GET /api/auth/me` – Mengambil profil pengguna yang sedang login.

### Master Produk
- `GET /api/products` – Menampilkan katalog produk dengan saldo stok terkini.
- `POST /api/products` *(Supervisor)* – Menambahkan produk baru (SKU unik).
- `GET /api/products/:id` – Detail spesifik produk.

### Dokumen & Penerimaan Barang (Receiving)
- `GET /api/receivings` – Daftar dokumen receiving (filter status `DRAFT`, `IN_PROGRESS`, `COMPLETED`).
- `POST /api/receivings` *(Supervisor)* – Membuat dokumen receiving baru dengan status `DRAFT`.
- `GET /api/receivings/:id` – Detail dokumen beserta seluruh baris item dan progres kuantitas.
- `POST /api/receivings/:id/receive` – **Aturan Bisnis Kritis (ACID Transaction)**:
  * Memvalidasi: `increment_quantity <= expected_quantity - received_quantity`. Jika melebihi, ditolak dengan **HTTP 422**.
  * Menggunakan **Pessimistic Row Locking** (`SELECT ... FOR UPDATE`) untuk mencegah kondisi balapan (*race condition*).
  * Memperbarui `received_quantity` dan status item (`PARTIAL` atau `COMPLETED`).
  * Mengubah status dokumen menjadi `IN_PROGRESS` jika sebelumnya `DRAFT`.
  * Memperbarui saldo inventaris (`inventories.quantity`) dan mencatat log permanen di `inventory_transactions`.
- `POST /api/receivings/:id/complete` *(Supervisor)* – **Aturan Bisnis Kritis**:
  * Memeriksa seluruh item dalam dokumen. Jika masih ada item yang belum 100% diterima, ditolak dengan **HTTP 400**.
  * Jika seluruh item telah lengkap, status dokumen berubah menjadi `COMPLETED` dan dikunci permanen.

### Inventaris & Log Audit
- `GET /api/inventory` – Saldo stok fisik seluruh produk.
- `GET /api/inventory/transactions` *(Supervisor)* – Log kartu stok / jejak audit mutasi barang masuk.
