# Warehouse Receiving System (WRS)

Sistem Informasi Manajemen Penerimaan Barang Gudang (*Warehouse Inbound Receiving Management System*) berbasis **Specification-Driven Development (SDD)**. Sistem ini menjamin integritas transaksi ACID, mengeliminasi risiko *over-receiving* secara absolut, dan menyediakan jejak audit permanen (*immutable audit ledger*).

---

## 1. Menjalankan Seluruh Aplikasi Dari Nol (Quick Start)

Seluruh ekosistem aplikasi (Database PostgreSQL 15, Backend Node.js Express, dan Frontend Nginx React) telah dikonfigurasi penuh dan siap dijalankan dengan **satu perintah tunggal**:

```bash
docker compose up --build
```

### Apa yang Terjadi Secara Otomatis:
1. **`db` (PostgreSQL 15 Alpine)**:
   - Container basis data menyala dan menyiapkan volume penyimpanan persisten `pgdata`.
   - Melakukan self-test berkala via `pg_isready` hingga berstatus **healthy**.
2. **`backend` (Node.js 20 Express TypeScript)**:
   - Otomatis menunggu service database mencapai status **healthy**.
   - Menjalankan **migrasi skema database** (membuat tabel, enum, foreign keys, triggers, dan check constraints pencegah over-receiving).
   - Menjalankan **seeder awal** (membuat akun demo `supervisor` & `operator`, serta data master produk awal).
   - Menyalakan server REST API pada port `5000`.
3. **`frontend` (React 19 + Vite + Tailwind CSS -> Nginx Alpine)**:
   - Menjalankan multi-stage build untuk mengompilasi bundel statis produksi.
   - Disajikan melalui Nginx pada port `3000` dengan dukungan *Single Page Application* (SPA) routing dan reverse proxy otomatis ke backend.

### Akses Layanan:
| Komponen | URL Akses | Deskripsi |
| :--- | :--- | :--- |
| **Web Application (UI)** | **[http://localhost:3000](http://localhost:3000)** | Antarmuka pengguna responsif (Desktop & Mobile/Tablet gudang) |
| **Backend REST API** | **[http://localhost:5000/api](http://localhost:5000/api)** | Endpoint API terintegrasi |
| **Health Check API** | **[http://localhost:5000/health](http://localhost:5000/health)** | Status operasional backend & konektivitas database |

Untuk mematikan seluruh container:
```bash
docker compose down
```
Untuk mematikan dan mereset volume basis data dari nol:
```bash
docker compose down -v
```

---

## 2. Kredensial Akun Demo

Sistem mengadopsi prinsip *Role-Based Access Control* (RBAC) dengan pemisahan tugas (*Segregation of Duties*):

| Role | Username | Password | Otoritas & Fitur Utama |
| :--- | :--- | :--- | :--- |
| **Warehouse Supervisor** | `supervisor` | `password123` | • Membuat dokumen inbound receiving baru (`DRAFT`).<br>• Menetapkan daftar item dan kuantitas ekspektasi.<br>• Menyelesaikan dokumen (`COMPLETED`) dengan validasi kelengkapan 100%.<br>• Mengelola katalog master produk (Tambah/Edit SKU & Satuan).<br>• Mengakses kartu stok dan riwayat audit mutasi inventaris. |
| **Warehouse Operator** | `operator` | `password123` | • Melihat daftar dokumen receiving yang sedang aktif.<br>• Memeriksa fisik dan mencatat kuantitas barang masuk (parsial/penuh).<br>• Validasi real-time anti over-receiving (input ditolak jika melebihi sisa).<br>• Pemindaian barcode SKU barang.<br>• *Dibatasi: Tidak dapat membuat/menutup dokumen atau mengubah master data.* |

> [!TIP]
> **Akses Cepat (One-Click Demo)**: Pada halaman login ([http://localhost:3000/login](http://localhost:3000/login)), tersedia tombol cepat **"Login sebagai Supervisor"** dan **"Login sebagai Operator"** untuk mengisi kredensial secara otomatis dengan satu klik.

---

## 3. Panduan Menjalankan Automated Testing

Sistem dilengkapi test suite integrasi otomatis (*Automated Integration QA Suite*) komprehensif berbasis **Jest** dan **Supertest** yang memvalidasi langsung ke instance PostgreSQL riil (18 skenario uji, **100% Pass Rate**).

### Cakupan 4 Skenario Uji Kritis:
1. **Skenario 1 (Over-receiving Validation)**: Menolak pencatatan fisik melebihi sisa ekspektasi (HTTP 422) dan memverifikasi atomic rollback (tidak ada data korup).
2. **Skenario 2 (Document Completion Rules)**: Menolak penyelesaian dokumen jika masih ada item `PENDING` atau `PARTIAL` (HTTP 400), mengizinkan saat 100% lengkap (HTTP 200), dan melarang transaksi pada dokumen `COMPLETED` (HTTP 409).
3. **Skenario 3 (Data Integrity & Stock Mutation)**: Memverifikasi perubahan status otomatis `DRAFT` -> `IN_PROGRESS`, sinkronisasi saldo `inventories`, dan pencatatan riwayat transaksi pada `inventory_transactions`.
4. **Skenario 4 (RBAC & Keamanan Hak Akses)**: Memastikan Operator ditolak dengan HTTP 403 Forbidden saat mencoba mengeksekusi fitur Supervisor, dan penolakan request tanpa token dengan HTTP 401 Unauthorized.

### Cara Menjalankan Automated Testing:

#### Opsi 1: Menjalankan via Database Docker (Paling Praktis)
Jika container Docker sedang menyala:
```bash
cd backend
npm test
```
*Catatan: Pastikan container database (`db`) menyala di port 5432.*

#### Opsi 2: Menjalankan Langsung di Dalam Container Backend Docker
```bash
docker compose exec backend npm test
```

#### Opsi 3: Menjalankan Secara Lokal (Manual)
Jika menggunakan PostgreSQL lokal tanpa Docker:
```bash
cd backend
# 1. Pastikan file backend/.env sudah sesuai dengan PostgreSQL lokal Anda
# 2. Jalankan migrasi dan seeder awal
npm run db:setup

# 3. Jalankan automated test suite
npm test
```

Hasil eksekusi pengujian yang diharapkan:
```text
Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Snapshots:   0 total
Time:        ~5 s
Ran all test suites.
```

---

## 4. Struktur Proyek & Dokumentasi Spesifikasi (SSOT)

```text
warehouse-receiving-system/
├── docker-compose.yml          # Orkestrasi multi-container (db, backend, frontend)
├── docs/                       # Single Source of Truth (SSOT) Dokumen Spesifikasi
│   ├── prd.md                  # Product Requirements Document & Business Rules
│   ├── erd.mmd                 # Entity Relationship Diagram (Mermaid)
│   ├── technical-spec.md       # Arsitektur, DDL PostgreSQL, dan Row-Level Locking
│   ├── openapi.yaml            # Spesifikasi Kontrak REST API (OpenAPI 3.0.3)
│   ├── testing.md              # Laporan QA & Matriks Pengujian Otomatis
│   └── ai-workflow.md          # Laporan Alur Kerja Specification-Driven Development
├── backend/                    # Layanan REST API (Node.js Express + TypeScript + PostgreSQL)
│   ├── Dockerfile              # Multi-stage Docker build untuk backend
│   ├── src/                    # Source code (Controller, Service, Middleware, DDL)
│   └── tests/                  # Integration QA Suite (Jest + Supertest)
└── frontend/                   # Aplikasi Web Klien (React 19 + TypeScript + Vite + Tailwind)
    ├── Dockerfile              # Multi-stage Docker build (Vite -> Nginx)
    ├── nginx.conf              # Konfigurasi reverse proxy & SPA routing Nginx
    └── src/                    # Komponen UI responsif & integrasi API
```

Untuk detail arsitektur dan spesifikasi bisnis lengkap, silakan kunjungi:
- **[Dokumentasi SSOT Lengkap](/docs/README.md)**
- **[Laporan Alur Kerja AI & SDD](/docs/ai-workflow.md)**
- **[Laporan Pengujian Otomatis QA](/docs/testing.md)**
